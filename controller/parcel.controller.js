import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  createParcelBooking,
  findParcelForUser,
  generateParcelQrCode,
  getStatusHistory,
  getTrackingFeed,
  listCustomerParcels,
} from "../services/parcel.service.js";

export const createParcel = catchAsync(async (req, res) => {
  const parcel = await createParcelBooking(req.user._id, req.body);
  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Parcel booking created",
    data: parcel,
  });
});

export const myParcels = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
  const { data, meta } = await listCustomerParcels({
    customerId: req.user._id,
    page: Number(page),
    limit: Number(limit),
    status,
    dateFrom,
    dateTo,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcels loaded",
    data,
    meta,
  });
});

export const parcelDetail = catchAsync(async (req, res) => {
  const parcel = await findParcelForUser(req.params.id, req.user);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcel detail",
    data: parcel,
  });
});

export const parcelStatusHistory = catchAsync(async (req, res) => {
  const history = await getStatusHistory(req.params.id, req.user);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Parcel history",
    data: history,
  });
});

export const parcelTracking = catchAsync(async (req, res) => {
  const feed = await getTrackingFeed(req.params.id, req.user);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Tracking feed",
    data: feed,
  });
});

export const parcelQrCode = catchAsync(async (req, res) => {
  const svg = await generateParcelQrCode(req.params.id, req.user);
  res.setHeader("Content-Type", "image/svg+xml");
  return res.send(svg);
});
