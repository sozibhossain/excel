import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import rbac from "../middleware/rbac.middleware.js";
import {
  agentLocation,
  agentParcels,
  agentRoute,
  agentStatusUpdate,
  agentTracking,
  scanController,
} from "../controller/agent.controller.js";

const router = express.Router();

router.use(protect(), rbac("AGENT"));

router.get("/parcels", agentParcels);
router.patch("/parcels/:id/status", agentStatusUpdate);
router.post("/parcels/:id/tracking", agentTracking);
router.post("/location", agentLocation);
router.post("/route", agentRoute);
router.post("/scan", scanController);

export default router;
