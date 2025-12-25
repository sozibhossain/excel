import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    label: { type: String, required: true },
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    postalCode: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { timestamps: true }
);

export const Address =
  mongoose.models.Address || mongoose.model("Address", addressSchema);
