import mongoose, { Schema } from "mongoose";

export const ParcelStatusEnum = [
  "BOOKED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

export const PaymentTypeEnum = ["COD", "PREPAID"];

const parcelSchema = new Schema(
  {
    trackingCode: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pickupAddressId: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    deliveryAddressId: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    parcelType: { type: String, required: true },
    parcelSize: { type: String, required: true },
    weight: { type: Number },
    paymentType: { type: String, enum: PaymentTypeEnum, required: true },
    codAmount: { type: Number, default: 0 },
    status: { type: String, enum: ParcelStatusEnum, default: "BOOKED" },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    scheduledPickupAt: { type: Date },
    deliveredAt: { type: Date },
    failureReason: { type: String },
    qrCodeData: { type: String },
    barcodeData: { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// parcelSchema.index({ trackingCode: 1 }, { unique: true });
parcelSchema.index({ customerId: 1, createdAt: -1 });
parcelSchema.index({ assignedAgentId: 1, status: 1 });

export const Parcel =
  mongoose.models.Parcel || mongoose.model("Parcel", parcelSchema);
