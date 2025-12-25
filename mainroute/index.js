import express from "express";
import authRoute from "../route/auth.route.js";
import userRoute from "../route/user.route.js";
import parcelRoute from "../route/parcel.route.js";
import agentRoute from "../route/agent.route.js";
import adminRoute from "../route/admin.route.js";
import notificationRoute from "../route/notification.route.js";

const router = express.Router();

router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/parcels", parcelRoute);
router.use("/agent", agentRoute);
router.use("/admin", adminRoute);
router.use("/notifications", notificationRoute);

export default router;
