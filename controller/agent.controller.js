import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  changeParcelStatus,
  listAgentParcels,
  optimizeRoute,
  recordTrackingPoint,
  scanParcelCode,
  updateAgentLocation,
} from "../services/agent.service.js";

export const agentParcels = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const { data, meta } = await listAgentParcels({
    agentId: req.user._id,
    page: Number(page),
    limit: Number(limit),
    status,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Agent parcels",
    data,
    meta,
  });
});

export const agentStatusUpdate = catchAsync(async (req, res) => {
  const parcel = await changeParcelStatus({
    parcelId: req.params.id,
    status: req.body.status,
    note: req.body.note,
    actor: req.user,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcel status updated",
    data: parcel,
  });
});

export const agentTracking = catchAsync(async (req, res) => {
  const point = await recordTrackingPoint({
    parcelId: req.params.id,
    agentId: req.user._id,
    ...req.body,
  });
  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Tracking point recorded",
    data: point,
  });
});

export const agentLocation = catchAsync(async (req, res) => {
  const profile = await updateAgentLocation({
    userId: req.user._id,
    lat: req.body.lat,
    lng: req.body.lng,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Location updated",
    data: profile,
  });
});

export const agentRoute = catchAsync(async (req, res) => {
  let waypoints = req.body?.waypoints;
  if (!waypoints && req.query.waypoints) {
    try {
      waypoints = JSON.parse(req.query.waypoints);
    } catch (error) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid waypoints payload");
    }
  }
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new AppError(httpStatus.BAD_REQUEST, "At least two waypoints are required");
  }
  const route = await optimizeRoute({ agentId: req.user._id, waypoints });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Route optimized",
    data: route,
  });
});

export const scanController = catchAsync(async (req, res) => {
  const result = await scanParcelCode({
    parcelId: req.body.parcelId,
    code: req.body.code,
    agentId: req.user._id,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Scan successful",
    data: result,
  });
});
