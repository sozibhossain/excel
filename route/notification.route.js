import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import rbac from "../middleware/rbac.middleware.js";
import { notificationTest } from "../controller/notification.controller.js";

const router = express.Router();

router.post("/test", protect(), rbac("ADMIN"), notificationTest);

export default router;
