import httpStatus from "http-status";
import { v4 as uuidv4 } from "uuid";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import env from "../config/env.js";
import { User, RoleEnum, LanguageEnum } from "../model/user.model.js";
import { RefreshToken } from "../model/refreshToken.model.js";
import { hashPassword, verifyPassword, hashToken } from "../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { durationToDate } from "../utils/duration.js";
import sendResponse from "../utils/sendResponse.js";

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject({ getters: true });
  delete user.passwordHash;
  delete user.deletedAt;
  return user;
};

const ensureRolePermissions = (requestedRole, actorRole) => {
  if (!requestedRole || requestedRole === "CUSTOMER") return;
  if (actorRole !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only admins can create privileged accounts");
  }
};

const createSession = async (user) => {
  const tokenId = uuidv4();
  const accessToken = signAccessToken({ sub: user._id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id, role: user.role, tokenId });

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: durationToDate(env.JWT_REFRESH_EXPIRES_IN),
  });

  return { accessToken, refreshToken };
};

export const register = catchAsync(async (req, res) => {
  const normalizedRole = (req.body.role || "CUSTOMER").toUpperCase();
  const normalizedLanguage = (req.body.language || "EN").toUpperCase();
  ensureRolePermissions(normalizedRole, req.user?.role);

  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "User already exists with this email");
  }

  if (!RoleEnum.includes(normalizedRole)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role supplied");
  }
  if (!LanguageEnum.includes(normalizedLanguage)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid language supplied");
  }

  const user = await User.create({
    name: req.body.name,
    email,
    phone: req.body.phone,
    language: normalizedLanguage,
    role: normalizedRole,
    passwordHash: await hashPassword(req.body.password),
  });

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "User registered successfully",
    data: { user: sanitizeUser(user) },
  });
});


export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash +isActive +role");
  if (!user || !user.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials or inactive account");
  }

  const matched = await verifyPassword(user.passwordHash, password);
  if (!matched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  const tokens = await createSession(user);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Login successful",
    data: {
      user: sanitizeUser(user),
      tokens,
    },
  });
});

export const refreshSession = catchAsync(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, "Refresh token is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const existing = await RefreshToken.findOne({ tokenId: payload.tokenId });
  if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token expired");
  }

  if (existing.tokenHash !== hashToken(token)) {
    existing.isRevoked = true;
    await existing.save();
    throw new AppError(httpStatus.UNAUTHORIZED, "Token reuse detected");
  }

  existing.isRevoked = true;
  await existing.save();

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User no longer exists");
  }

  const tokens = await createSession(user);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Session refreshed",
    data: { user: sanitizeUser(user), tokens },
  });
});

export const logout = catchAsync(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    res.clearCookie("refreshToken");
    return res.status(httpStatus.NO_CONTENT).send();
  }
  try {
    const payload = verifyRefreshToken(token);
    await RefreshToken.updateMany({ tokenId: payload.tokenId }, { isRevoked: true });
  } catch (error) {
    // ignore errors, logout is best-effort
  }

  res.clearCookie("refreshToken");
  return res.status(httpStatus.NO_CONTENT).send();
});

export const me = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authenticated");
  }
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Profile loaded",
    data: { user: sanitizeUser(req.user) },
  });
});
