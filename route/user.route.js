import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

/**
 * User Routes
 * Base: /api/v1/users
 */

/**
 * @route   GET /me
 * @desc    Get logged-in user's profile
 * @access  Private
 */
router.get("/me", protect, getProfile);

/**
 * @route   PATCH /me
 * @desc    Update logged-in user's profile (name/avatar)
 * @access  Private
 */
router.patch("/me", protect, upload.single("avatar"), updateProfile);

/**
 * @route   PATCH /change-password
 * @desc    Change logged-in user's password
 * @access  Private
 */
router.patch("/change-password", protect, changePassword);

export default router;
