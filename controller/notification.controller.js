import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import { testNotification } from "../services/notification.service.js";

export const notificationTest = catchAsync(async (req, res) => {
  const notification = await testNotification(req.body);
  return sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    message: "Notification logged",
    data: notification,
  });
});
