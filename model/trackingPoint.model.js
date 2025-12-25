import mongoose, { Schema } from "mongoose";

const trackingPointSchema = new Schema(
  {
    parcelId: { type: Schema.Types.ObjectId, ref: "Parcel", required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number },
    heading: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

trackingPointSchema.index({ parcelId: 1, createdAt: -1 });

export const TrackingPoint =
  mongoose.models.TrackingPoint || mongoose.model("TrackingPoint", trackingPointSchema);
