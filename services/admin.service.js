import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { Parcel } from "../model/parcel.model.js";
import { buildPaginationMeta } from "../utils/pagination.js";
import { User, RoleEnum } from "../model/user.model.js";
import { ParcelStatusHistory } from "../model/parcelStatusHistory.model.js";
import { AuditLog } from "../model/auditLog.model.js";
import { emitParcelStatus, emitUserNotification } from "../sockets/emitter.js";

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

export const adminParcelList = async ({
  page,
  limit,
  status,
  agentId,
  customerId,
  dateFrom,
  dateTo,
}) => {
  const filters = {};
  if (status) filters.status = status;
  if (agentId) filters.assignedAgentId = agentId;
  if (customerId) filters.customerId = customerId;
  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.$lte = new Date(dateTo);
  }
  const query = Parcel.find(filters)
    .populate("pickupAddressId deliveryAddressId customerId assignedAgentId")
    .sort({ createdAt: -1 });
  const [data, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Parcel.countDocuments(filters),
  ]);
  return { data, meta: buildPaginationMeta({ page, limit, total }) };
};

export const assignParcelAgent = async ({ parcelId, agentId, actorId }) => {
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== "AGENT") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid agent");
  }

  const parcel = await Parcel.findByIdAndUpdate(
    parcelId,
    { assignedAgentId: agentId, status: "ASSIGNED" },
    { new: true }
  );
  if (!parcel) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  await ParcelStatusHistory.create({
    parcelId,
    status: "ASSIGNED",
    changedByUserId: actorId,
    note: `Assigned to ${agent.name}`,
  });

  await AuditLog.create({
    actorId,
    action: "PARCEL_ASSIGNED",
    details: { parcelId, agentId },
  });

  emitParcelStatus({
    parcelId: parcel._id.toString(),
    customerId: parcel.customerId.toString(),
    agentId: parcel.assignedAgentId?.toString(),
    payload: { status: "ASSIGNED" },
  });

  emitUserNotification({
    userId: agent._id.toString(),
    role: agent.role,
    payload: {
      type: "PARCEL_ASSIGNED",
      message: `New parcel assigned (${parcel.trackingCode})`,
      parcelId: parcel._id.toString(),
      trackingCode: parcel.trackingCode,
    },
  });

  return parcel;
};

export const updateUserAccount = async ({ userId, role, isActive, actorId }) => {
  if (role === undefined && isActive === undefined) {
    throw new AppError(httpStatus.BAD_REQUEST, "role or isActive is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const updates = {};

  if (role !== undefined) {
    if (typeof role !== "string") {
      throw new AppError(httpStatus.BAD_REQUEST, "role must be a string");
    }
    const normalizedRole = role.toUpperCase();
    if (!RoleEnum.includes(normalizedRole)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid role supplied");
    }
    if (user.role !== normalizedRole) {
      user.role = normalizedRole;
      updates.role = normalizedRole;
    }
  }

  if (isActive !== undefined) {
    const normalizedActive = parseBoolean(isActive);
    if (normalizedActive === undefined) {
      throw new AppError(httpStatus.BAD_REQUEST, "isActive must be a boolean value");
    }
    if (user.isActive !== normalizedActive) {
      user.isActive = normalizedActive;
      updates.isActive = normalizedActive;
    }
  }

  if (!Object.keys(updates).length) {
    throw new AppError(httpStatus.BAD_REQUEST, "No changes detected for user");
  }

  await user.save();

  await AuditLog.create({
    actorId,
    action: "USER_ACCOUNT_UPDATED",
    details: { userId, ...updates },
  });

  emitUserNotification({
    userId: user._id.toString(),
    role: user.role,
    payload: {
      type: "USER_ACCOUNT_UPDATED",
      message: "Your account settings were updated by an administrator",
      data: { role: user.role, isActive: user.isActive },
    },
  });

  return user;
};

export const adminUsersList = async ({ page, limit, role }) => {
  const filters = {};
  if (role) filters.role = role;
  const query = User.find(filters).sort({ createdAt: -1 });
  const [data, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    User.countDocuments(filters),
  ]);
  return { data, meta: buildPaginationMeta({ page, limit, total }) };
};

export const dashboardMetrics = async () => {
  const [dailyBookings, failedDeliveries, codTotals, deliveredTotals] = await Promise.all([
    Parcel.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    Parcel.countDocuments({ status: "FAILED" }),
    Parcel.aggregate([
      { $match: { paymentType: "COD" } },
      { $group: { _id: null, total: { $sum: "$codAmount" } } },
    ]),
    Parcel.countDocuments({ status: "DELIVERED" }),
  ]);

  return {
    dailyBookings,
    failedDeliveries,
    codTotal: codTotals?.[0]?.total ?? 0,
    deliveredTotal: deliveredTotals,
  };
};
