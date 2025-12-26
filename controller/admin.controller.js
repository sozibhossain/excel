import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  adminParcelList,
  adminUsersList,
  assignParcelAgent,
  dashboardMetrics,
  updateUserAccount,
} from "../services/admin.service.js";
import { updateParcelStatus } from "../services/parcel.service.js";

export const adminParcels = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, agentId, customerId, dateFrom, dateTo } = req.query;
  const { data, meta } = await adminParcelList({
    page: Number(page),
    limit: Number(limit),
    status,
    agentId,
    customerId,
    dateFrom,
    dateTo,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcels fetched",
    data,
    meta,
  });
});

export const assignAgent = catchAsync(async (req, res) => {
  const parcel = await assignParcelAgent({
    parcelId: req.params.id,
    agentId: req.body.agentId,
    actorId: req.user._id,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Agent assigned",
    data: parcel,
  });
});

export const adminStatusUpdate = catchAsync(async (req, res) => {
  const parcel = await updateParcelStatus({
    parcelId: req.params.id,
    nextStatus: req.body.status,
    note: req.body.note,
    actor: req.user,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcel status updated",
    data: parcel,
  });
});

export const adminUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role } = req.query;
  const { data, meta } = await adminUsersList({
    page: Number(page),
    limit: Number(limit),
    role,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Users fetched",
    data,
    meta,
  });
});

export const adminUpdateUser = catchAsync(async (req, res) => {
  const user = await updateUserAccount({
    userId: req.params.id,
    role: req.body.role,
    isActive: req.body.isActive,
    actorId: req.user._id,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User updated",
    data: user,
  });
});

export const metrics = catchAsync(async (req, res) => {
  const result = await dashboardMetrics();
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Metrics fetched",
    data: result,
  });
});
