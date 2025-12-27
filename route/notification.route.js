import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import rbac from "../middleware/rbac.middleware.js";
import {
  getNotifications,
  markAllNotifications,
  markNotification,
  notificationTest,
} from "../controller/notification.controller.js";

const router = express.Router();

router.get("/", protect(), getNotifications);
router.patch("/mark-all", protect(), markAllNotifications);
router.patch("/:id/mark", protect(), markNotification);
router.post("/test", protect(), rbac("ADMIN"), notificationTest);

export default router;
