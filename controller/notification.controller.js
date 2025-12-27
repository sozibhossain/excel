import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  testNotification,
} from "../services/notification.service.js";

export const notificationTest = catchAsync(async (req, res) => {
  const notification = await testNotification(req.body);
  return sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    message: "Notification logged",
    data: notification,
  });
});

export const getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const result = await listUserNotifications({
    userId: req.user?._id,
    page: Number(page),
    limit: Number(limit),
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Notifications loaded",
    data: result.data,
    meta: result.meta,
  });
});

export const markNotification = catchAsync(async (req, res) => {
  const result = await markNotificationAsRead({
    notificationId: req.params.id,
    userId: req.user?._id,
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Notification updated",
    data: result.notification,
    meta: { unreadCount: result.unreadCount },
  });
});

export const markAllNotifications = catchAsync(async (req, res) => {
  const result = await markAllNotificationsAsRead({ userId: req.user?._id });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Notifications cleared",
    data: { success: true },
    meta: { unreadCount: result.unreadCount },
  });
});
