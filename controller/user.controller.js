import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/v1/users/me (example)
 * @access  Private
 */
export const getProfile = catchAsync(async (req, res) => {
  // Exclude sensitive fields from response
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: user,
  });
});

/**
 * @desc    Update logged-in user's profile
 * @route   PATCH /api/v1/users/me (example)
 * @access  Private
 */
export const updateProfile = catchAsync(async (req, res) => {
  const { name } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Update basic fields if provided
  if (name?.trim()) user.name = name.trim();

  // If user uploaded a file (avatar), upload it to Cloudinary
  if (req.file?.buffer) {
    const upload = await uploadOnCloudinary(req.file.buffer);

    if (!upload?.public_id || !upload?.secure_url) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Avatar upload failed, please try again"
      );
    }

    user.avatar = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }

  await user.save();

  // Return safe user object (optional: exclude sensitive fields)
  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

/**
 * @desc    Change logged-in user's password
 * @route   PATCH /api/v1/users/change-password (example)
 * @access  Private
 */
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate required inputs
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Current password, new password and confirm password are required"
    );
  }

  // Confirm passwords match
  if (newPassword !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords don't match");
  }

  // Prevent using the same password again
  if (currentPassword === newPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "New password must be different from current password"
    );
  }

  // Fetch user with password field
  const user = await User.findById(req.user?._id).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check current password correctness
  const isMatched = await User.isPasswordMatched(currentPassword, user.password);
  if (!isMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password is wrong");
  }

  // Update password (hashing should happen in schema pre-save hook)
  user.password = newPassword;
  await user.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});
