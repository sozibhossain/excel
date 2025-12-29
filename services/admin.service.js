import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { Parcel } from "../model/parcel.model.js";
import { buildPaginationMeta } from "../utils/pagination.js";
import { User, RoleEnum } from "../model/user.model.js";
import { ParcelStatusHistory } from "../model/parcelStatusHistory.model.js";
import { AuditLog } from "../model/auditLog.model.js";
import { emitParcelStatus } from "../sockets/emitter.js";
import { TrackingPoint } from "../model/trackingPoint.model.js";
import { Address } from "../model/address.model.js";
import { createUserNotification } from "./notification.service.js";

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
  const filters = { deletedAt: null };
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
  if (!agent || agent.role !== "AGENT" || !agent.isActive || agent.deletedAt) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid agent");
  }

  const parcel = await Parcel.findOneAndUpdate(
    { _id: parcelId, deletedAt: null },
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
    payload: {
      trackingCode: parcel.trackingCode,
      status: "ASSIGNED",
      note: `Assigned to ${agent.name}`,
      updatedAt: parcel.updatedAt instanceof Date ? parcel.updatedAt.toISOString() : undefined,
    },
  });

  await createUserNotification({
    userId: agent._id,
    role: agent.role,
    type: "PARCEL_ASSIGNED",
    title: "New parcel assigned",
    body: `New parcel assigned (${parcel.trackingCode})`,
    data: {
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
  if (!user || user.deletedAt) {
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

  await createUserNotification({
    userId: user._id,
    role: user.role,
    type: "USER_ACCOUNT_UPDATED",
    title: "Account updated",
    body: "Your account settings were updated by an administrator",
    data: { role: user.role, isActive: user.isActive },
  });

  return user;
};

export const adminUsersList = async ({ page, limit, role }) => {
  const filters = { deletedAt: null };
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
      deletedAt: null,
    }),
    Parcel.countDocuments({ status: "FAILED", deletedAt: null }),
    Parcel.aggregate([
      { $match: { paymentType: "COD", deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$codAmount" } } },
    ]),
    Parcel.countDocuments({ status: "DELIVERED", deletedAt: null }),
  ]);

  return {
    dailyBookings,
    failedDeliveries,
    codTotal: codTotals?.[0]?.total ?? 0,
    deliveredTotal: deliveredTotals,
  };
};

export const deleteParcelRecord = async ({ parcelId, actorId }) => {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel || parcel.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  const previousAgentId = parcel.assignedAgentId?.toString();
  parcel.status = "CANCELLED";
  parcel.assignedAgentId = undefined;
  parcel.deletedAt = new Date();
  await parcel.save();

  await ParcelStatusHistory.create({
    parcelId,
    status: "CANCELLED",
    note: "Parcel deleted by administrator",
    changedByUserId: actorId,
  });

  await TrackingPoint.deleteMany({ parcelId });
  if (parcel.pickupAddressId) {
    await Address.deleteOne({ _id: parcel.pickupAddressId });
  }
  if (parcel.deliveryAddressId) {
    await Address.deleteOne({ _id: parcel.deliveryAddressId });
  }

  await AuditLog.create({
    actorId,
    action: "PARCEL_DELETED",
    details: { parcelId },
  });

  await createUserNotification({
    userId: parcel.customerId,
    role: "CUSTOMER",
    type: "PARCEL_DELETED",
    title: "Parcel removed",
    body: `Parcel ${parcel.trackingCode} was removed by an administrator`,
    data: {
      parcelId: parcel._id.toString(),
      trackingCode: parcel.trackingCode,
    },
  });

  if (previousAgentId) {
    await createUserNotification({
      userId: previousAgentId,
      role: "AGENT",
      type: "PARCEL_DELETED",
      title: "Parcel removed",
      body: `Parcel ${parcel.trackingCode} was removed from the network`,
      data: {
        parcelId: parcel._id.toString(),
        trackingCode: parcel.trackingCode,
      },
    });
  }

  emitParcelStatus({
    parcelId: parcel._id.toString(),
    customerId: parcel.customerId.toString(),
    agentId: previousAgentId ?? undefined,
    payload: {
      trackingCode: parcel.trackingCode,
      status: "CANCELLED",
      note: "Parcel deleted by administrator",
      updatedAt: parcel.updatedAt instanceof Date ? parcel.updatedAt.toISOString() : undefined,
    },
  });

  return parcel;
};

export const deleteUserAccount = async ({ userId, actorId }) => {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user._id.toString() === actorId.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot delete your own account");
  }

  user.isActive = false;
  user.deletedAt = new Date();
  await user.save();

  if (user.role === "AGENT") {
    await Parcel.updateMany(
      { assignedAgentId: userId },
      { $unset: { assignedAgentId: "" } }
    );
  }

  await AuditLog.create({
    actorId,
    action: "USER_DELETED",
    details: { userId },
  });

  return user;
};
