import express from "express";
import {
  register,
  login,
  verifyEmail,
  forgetPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
} from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Auth Routes
 * Base: /api/v1/auth
 */

/** Register (creates user + sends OTP) */
router.post("/register", register);

/** Verify email with OTP */
router.post("/verify-email", verifyEmail);

/** Login (blocks if email not verified, resends OTP) */
router.post("/login", login);

/** Request password reset OTP */
router.post("/forgot-password", forgetPassword);

/** Reset password using OTP */
router.post("/reset-password", resetPassword);

/** Change password (logged in) */
router.patch("/change-password", protect, changePassword);

/** Refresh access token (using refresh token) */
router.post("/refresh-token", refreshToken);

/** Logout (invalidate refresh token) */
router.post("/logout", protect, logout);

export default router;
