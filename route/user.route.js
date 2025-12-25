import express from "express";
import { getProfile, updatePreferences } from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect(), getProfile);
router.patch("/preferences", protect(), updatePreferences);

export default router;
