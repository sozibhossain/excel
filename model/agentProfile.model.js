import mongoose, { Schema } from "mongoose";

const agentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    vehicleType: { type: String },
    capacity: { type: Number },
    currentLat: { type: Number },
    currentLng: { type: Number },
    lastLocationAt: { type: Date },
  },
  { timestamps: true }
);

export const AgentProfile =
  mongoose.models.AgentProfile || mongoose.model("AgentProfile", agentProfileSchema);
