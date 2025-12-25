import mongoose, { Schema } from "mongoose";

const parcelStatusHistorySchema = new Schema(
  {
    parcelId: { type: Schema.Types.ObjectId, ref: "Parcel", required: true },
    status: { type: String, required: true },
    note: { type: String },
    changedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

parcelStatusHistorySchema.index({ parcelId: 1, createdAt: -1 });

export const ParcelStatusHistory =
  mongoose.models.ParcelStatusHistory ||
  mongoose.model("ParcelStatusHistory", parcelStatusHistorySchema);
