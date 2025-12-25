import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import rbac from "../middleware/rbac.middleware.js";
import {
  adminParcels,
  adminStatusUpdate,
  adminUsers,
  assignAgent,
  metrics,
} from "../controller/admin.controller.js";
import { bookingsCsv, bookingsPdf } from "../controller/reports.controller.js";

const router = express.Router();

router.use(protect(), rbac("ADMIN"));

router.get("/parcels", adminParcels);
router.post("/parcels/:id/assign-agent", assignAgent);
router.patch("/parcels/:id/status", adminStatusUpdate);
router.get("/users", adminUsers);
router.get("/metrics/dashboard", metrics);
router.get("/reports/bookings.csv", bookingsCsv);
router.get("/reports/bookings.pdf", bookingsPdf);

export default router;
