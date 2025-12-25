import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import rbac from "../middleware/rbac.middleware.js";
import {
  createParcel,
  myParcels,
  parcelDetail,
  parcelQrCode,
  parcelStatusHistory,
  parcelTracking,
} from "../controller/parcel.controller.js";

const router = express.Router();

router.post("/", protect(), rbac("CUSTOMER"), createParcel);
router.get("/my", protect(), rbac("CUSTOMER"), myParcels);
router.get("/:id", protect(), parcelDetail);
router.get("/:id/status-history", protect(), parcelStatusHistory);
router.get("/:id/track", protect(), parcelTracking);
router.get("/:id/qrcode", protect(), parcelQrCode);

export default router;
