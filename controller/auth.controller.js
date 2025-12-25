import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import { createToken, verifyToken } from "../utils/authToken.js";
import { generateOTP } from "../utils/commonMethod.js";
import { sendEmail } from "../utils/sendEmail.js";
import { User } from "../model/user.model.js";

/**
 * Helper: Generate access & refresh tokens for a user.
 */
const generateAuthTokens = (user) => {
  const payload = { _id: user._id, email: user.email, role: user.role };

  const accessToken = createToken(
    payload,
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = createToken(
    payload,
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_REFRESH_EXPIRES_IN
  );

  return { accessToken, refreshToken };
};

/**
 * Helper: Set refresh token cookie (recommended for web clients).
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  });
};

/**
 * @desc    Register a new user (email OTP verification required)
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = catchAsync(async (req, res) => {
  const { phone, name, email, password, confirmPassword } = req.body;

  // Basic validation
  if (!email || !password || !confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Please fill in all fields");
  }

  if (password !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  // Check duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Email already exists, please try another email"
    );
  }

  // Create user (mark as NOT verified)
  const user = await User.create({
    phone,
    name,
    email,
    password,
    verificationInfo: { token: "", verified: false },
  });

  // Optionally send OTP immediately on register (recommended)
  const otp = generateOTP();
  const otpToken = createToken(
    { otp },
    process.env.OTP_SECRET,
    process.env.OTP_EXPIRE
  );

  user.verificationInfo.token = otpToken;
  await user.save();

  await sendEmail(user.email, "Verify your account", `Your OTP is ${otp}`);

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully. Please verify OTP sent to email.",
    data: { email: user.email },
  });
});

/**
 * @desc    Verify email OTP
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const token = user.verificationInfo?.token;
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verification token missing");
  }

  let decoded;
  try {
    decoded = verifyToken(token, process.env.OTP_SECRET);
  } catch (err) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP expired or invalid");
  }

  if (String(decoded.otp) !== String(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  user.verificationInfo.verified = true;
  user.verificationInfo.token = "";
  await user.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully",
    data: null,
  });
});

/**
 * @desc    Login user (blocks login if email not verified)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and password are required");
  }

  const user = await User.isUserExistsByEmail(email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const isMatched =
    user?.password && (await User.isPasswordMatched(password, user.password));

  if (!isMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Block login if not verified (send OTP again)
  if (!user.verificationInfo?.verified) {
    const otp = generateOTP();
    const otpToken = createToken(
      { otp },
      process.env.OTP_SECRET,
      process.env.OTP_EXPIRE
    );

    user.verificationInfo.token = otpToken;
    await user.save();

    await sendEmail(user.email, "Verify your account", `Your OTP is ${otp}`);

    return sendResponse(res, {
      statusCode: httpStatus.FORBIDDEN,
      success: false,
      message: "Email is not verified. OTP sent again to your email.",
      data: { email: user.email },
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateAuthTokens(user);

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookie (optional but recommended)
  setRefreshCookie(res, refreshToken);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken,
      role: user.role,
      _id: user._id,
      user,
    },
  });
});

/**
 * @desc    Send OTP for forget password
 * @route   POST /api/v1/auth/forget-password
 * @access  Public
 */
export const forgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email is required");

  const user = await User.isUserExistsByEmail(email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const otp = generateOTP();
  const otpToken = createToken(
    { otp },
    process.env.OTP_SECRET,
    process.env.OTP_EXPIRE
  );

  user.password_reset_token = otpToken;
  await user.save();

  await sendEmail(user.email, "Reset Password", `Your OTP is ${otp}`);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email successfully",
    data: null,
  });
});

/**
 * @desc    Reset password using OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Email, OTP and new password are required"
    );
  }

  const user = await User.isUserExistsByEmail(email);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  if (!user.password_reset_token) {
    throw new AppError(httpStatus.BAD_REQUEST, "Reset token missing or expired");
  }

  let decoded;
  try {
    decoded = verifyToken(user.password_reset_token, process.env.OTP_SECRET);
  } catch (err) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP expired or invalid");
  }

  if (String(decoded.otp) !== String(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  user.password = password;
  user.password_reset_token = undefined;
  await user.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully",
    data: null,
  });
});

/**
 * @desc    Change password (requires auth)
 * @route   PATCH /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Old password, new password and confirm password are required"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  if (oldPassword === newPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "New password must be different from old password"
    );
  }

  const user = await User.findById(req.user?._id).select("+password");
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const matched = await User.isPasswordMatched(oldPassword, user.password);
  if (!matched) throw new AppError(httpStatus.UNAUTHORIZED, "Current password wrong");

  user.password = newPassword;
  await user.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (uses refresh token)
 */
export const refreshToken = catchAsync(async (req, res) => {
  // Prefer cookie refresh token; fallback to body
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) throw new AppError(httpStatus.BAD_REQUEST, "Refresh token is required");

  const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefresh } = generateAuthTokens(user);

  user.refreshToken = newRefresh;
  await user.save();

  setRefreshCookie(res, newRefresh);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken },
  });
});

/**
 * @desc    Logout user (invalidate refresh token)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = catchAsync(async (req, res) => {
  const userId = req.user?._id;

  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: "" }, { new: true });
  }

  // Clear cookie as well
  res.clearCookie("refreshToken", {
    secure: true,
    httpOnly: true,
    sameSite: "none",
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});
