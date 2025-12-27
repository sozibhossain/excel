import crypto from "crypto";
import QRCode from "qrcode";
import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { Parcel, PaymentTypeEnum } from "../model/parcel.model.js";
import { Address } from "../model/address.model.js";
import { ParcelStatusHistory } from "../model/parcelStatusHistory.model.js";
import { TrackingPoint } from "../model/trackingPoint.model.js";
import { buildPaginationMeta } from "../utils/pagination.js";
import { emitParcelStatus, emitTrackingPoint } from "../sockets/emitter.js";
import { AuditLog } from "../model/auditLog.model.js";
import { createUserNotification, notifyParcelEvent } from "./notification.service.js";

const generateTrackingCode = () =>
  `PKL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const parcelInclude = [
  { path: "pickupAddressId", model: "Address" },
  { path: "deliveryAddressId", model: "Address" },
  { path: "customerId", model: "User", select: "name email phone language" },
  { path: "assignedAgentId", model: "User", select: "name email phone" },
];

const ensureParcelAccess = (parcel, user) => {
  if (!parcel) return;
  if (user.role === "ADMIN") return;
  if (user.role === "CUSTOMER" && parcel.customerId.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, "Parcel not available for this user");
  }
  if (
    user.role === "AGENT" &&
    (!parcel.assignedAgentId || parcel.assignedAgentId.toString() !== user._id.toString())
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Parcel not assigned to this agent");
  }
};

export const createParcelBooking = async (customerId, payload) => {
  const trackingCode = generateTrackingCode();
  if (!PaymentTypeEnum.includes(payload.paymentType)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment type");
  }

  const pickup = await Address.create({ ...payload.pickupAddress, userId: customerId });
  const delivery = await Address.create({
    ...payload.deliveryAddress,
    userId: customerId,
  });

  const parcel = await Parcel.create({
    trackingCode,
    customerId,
    pickupAddressId: pickup._id,
    deliveryAddressId: delivery._id,
    parcelType: payload.parcelType,
    parcelSize: payload.parcelSize,
    weight: payload.weight,
    paymentType: payload.paymentType,
    codAmount: payload.paymentType === "PREPAID" ? 0 : payload.codAmount,
    scheduledPickupAt: payload.scheduledPickupAt ? new Date(payload.scheduledPickupAt) : undefined,
    qrCodeData: trackingCode,
    barcodeData: trackingCode,
  });

  await ParcelStatusHistory.create({
    parcelId: parcel._id,
    status: "BOOKED",
    changedByUserId: customerId,
    note: "Booking created",
  });

  emitParcelStatus({
    parcelId: parcel._id.toString(),
    customerId: customerId.toString(),
    agentId: null,
    payload: { status: "BOOKED" },
  });

  await parcel.populate(parcelInclude);
  await notifyParcelEvent({
    parcel,
    templateKey: "PARCEL_BOOKED",
    context: { scheduledPickupAt: parcel.scheduledPickupAt },
  });
  return parcel;
};

export const listCustomerParcels = async ({
  customerId,
  page,
  limit,
  status,
  dateFrom,
  dateTo,
}) => {
  const filters = { customerId, deletedAt: null };
  if (status) filters.status = status;
  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.$lte = new Date(dateTo);
  }

  const query = Parcel.find(filters).populate(parcelInclude).sort({ createdAt: -1 });
  const [data, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Parcel.countDocuments(filters),
  ]);

  return {
    data,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

export const findParcelForUser = async (id, user) => {
  const parcel = await Parcel.findById(id).populate(parcelInclude);
  if (!parcel || parcel.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }
  ensureParcelAccess(parcel, user);
  return parcel;
};

export const getStatusHistory = async (parcelId, user) => {
  await findParcelForUser(parcelId, user);
  return ParcelStatusHistory.find({ parcelId }).sort({ createdAt: -1 });
};

export const getTrackingFeed = async (parcelId, user) => {
  await findParcelForUser(parcelId, user);
  const history = await TrackingPoint.find({ parcelId }).sort({ createdAt: -1 }).limit(20);
  return { latest: history[0] ?? null, history };
};

export const createTracking = async ({ parcelId, agentId, lat, lng, speed, heading }) => {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel || parcel.assignedAgentId?.toString() !== agentId.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, "Parcel not assigned to agent");
  }
  const point = await TrackingPoint.create({
    parcelId,
    agentId,
    lat,
    lng,
    speed,
    heading,
  });
  emitTrackingPoint(parcelId.toString(), point);
  return point;
};

const canTransition = (current, next) => {
  const map = {
    BOOKED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["IN_TRANSIT", "FAILED"],
    IN_TRANSIT: ["DELIVERED", "FAILED"],
    DELIVERED: [],
    FAILED: ["ASSIGNED", "CANCELLED"],
    CANCELLED: [],
  };
  return map[current]?.includes(next) ?? false;
};

export const updateParcelStatus = async ({ parcelId, nextStatus, actor, note }) => {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel || parcel.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }
  if (actor.role === "AGENT") {
    ensureParcelAccess(parcel, actor);
  }
  if (!canTransition(parcel.status, nextStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid status change from ${parcel.status} to ${nextStatus}`
    );
  }

  parcel.status = nextStatus;
  parcel.deliveredAt = nextStatus === "DELIVERED" ? new Date() : parcel.deliveredAt;
  parcel.failureReason = nextStatus === "FAILED" ? note : null;
  await parcel.save();

  await ParcelStatusHistory.create({
    parcelId,
    status: nextStatus,
    note,
    changedByUserId: actor._id,
  });

  if (actor.role === "ADMIN") {
    await AuditLog.create({
      actorId: actor._id,
      action: "PARCEL_STATUS_UPDATED",
      details: { parcelId, status: nextStatus },
    });
  }

  emitParcelStatus({
    parcelId: parcel._id.toString(),
    customerId: parcel.customerId.toString(),
    agentId: parcel.assignedAgentId?.toString(),
    payload: { status: nextStatus, note },
  });

  if (actor.role === "AGENT") {
    await createUserNotification({
      userId: parcel.customerId,
      role: "CUSTOMER",
      type: "PARCEL_STATUS_UPDATED",
      title: `Parcel is now ${nextStatus}`,
      body: `Parcel ${parcel.trackingCode} is now ${nextStatus}`,
      data: {
        parcelId: parcel._id.toString(),
        trackingCode: parcel.trackingCode,
        status: nextStatus,
        note,
      },
    });
  }

  await parcel.populate(parcelInclude);
  await notifyParcelEvent({
    parcel,
    templateKey: "PARCEL_STATUS_UPDATED",
    context: { status: nextStatus, note },
  });
  return parcel;
};

export const getParcelTrackingByCode = async (trackingCode, user) => {
  const parcel = await Parcel.findOne({ trackingCode, deletedAt: null }).populate(parcelInclude);
  if (!parcel) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }
  ensureParcelAccess(parcel, user);
  const [history, trackingPoints] = await Promise.all([
    ParcelStatusHistory.find({ parcelId: parcel._id }).sort({ createdAt: -1 }),
    TrackingPoint.find({ parcelId: parcel._id }).sort({ createdAt: -1 }).limit(50),
  ]);

  return {
    parcel,
    history,
    tracking: {
      latest: trackingPoints[0] ?? null,
      history: trackingPoints,
    },
  };
};

export const generateParcelQrCode = async (parcelId, user) => {
  const parcel = await findParcelForUser(parcelId, user);
  const payload = {
    id: parcel._id,
    trackingCode: parcel.trackingCode,
    customerId: parcel.customerId,
  };
  return QRCode.toString(JSON.stringify(payload), { type: "svg" });
};
