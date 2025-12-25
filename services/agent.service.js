import { Client } from "@googlemaps/google-maps-services-js";
import httpStatus from "http-status";
import crypto from "crypto";
import AppError from "../errors/AppError.js";
import { Parcel } from "../model/parcel.model.js";
import { AgentProfile } from "../model/agentProfile.model.js";
import { buildPaginationMeta } from "../utils/pagination.js";
import env from "../config/env.js";
import { createTracking, updateParcelStatus } from "./parcel.service.js";

const mapsClient = new Client({});

export const listAgentParcels = async ({ agentId, page, limit, status }) => {
  const filters = { assignedAgentId: agentId };
  if (status) filters.status = status;
  const query = Parcel.find(filters)
    .populate("pickupAddressId deliveryAddressId")
    .sort({ createdAt: -1 });
  const [data, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Parcel.countDocuments(filters),
  ]);
  return { data, meta: buildPaginationMeta({ page, limit, total }) };
};

export const updateAgentLocation = async ({ userId, lat, lng }) =>
  AgentProfile.findOneAndUpdate(
    { userId },
    { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
    { upsert: true, new: true }
  );

export const recordTrackingPoint = async (params) => createTracking(params);

export const changeParcelStatus = async ({ parcelId, status, note, actor }) =>
  updateParcelStatus({ parcelId, nextStatus: status, actor, note });

const hashWaypoints = (points) =>
  crypto.createHash("md5").update(points.map((p) => `${p.lat}:${p.lng}`).join("|")).digest("hex");

export const optimizeRoute = async ({ agentId, waypoints }) => {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new AppError(httpStatus.BAD_REQUEST, "Google Maps API key missing");
  }
  if (waypoints.length < 2) {
    throw new AppError(httpStatus.BAD_REQUEST, "At least two waypoints are required");
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1).map((point) => `${point.lat},${point.lng}`);

  const response = await mapsClient.directions({
    params: {
      key: env.GOOGLE_MAPS_API_KEY,
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: middle.length ? ["optimize:true", ...middle] : ["optimize:true"],
    },
  });

  const route = response.data.routes?.[0];
  if (!route) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unable to optimize route");
  }

  return {
    order: route.waypoint_order ?? [],
    polyline: route.overview_polyline?.points ?? "",
  };
};

export const scanParcelCode = async ({ parcelId, agentId, code }) => {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel || parcel.assignedAgentId?.toString() !== agentId.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, "Parcel not assigned to agent");
  }
  const matches = [parcel.trackingCode, parcel.qrCodeData, parcel.barcodeData].filter(Boolean);
  if (!matches.includes(code)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid code for parcel");
  }
  return { parcelId, verified: true };
};
