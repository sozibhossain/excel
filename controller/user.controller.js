import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../errors/AppError.js";

export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Profile fetched",
    data: user,
  });
});

export const updatePreferences = catchAsync(async (req, res) => {
  const { language } = req.body;
  if (!language) {
    throw new AppError(httpStatus.BAD_REQUEST, "language is required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { language },
    { new: true }
  );
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Preferences updated",
    data: user,
  });
});
