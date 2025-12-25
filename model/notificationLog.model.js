import mongoose, { Schema } from "mongoose";

const notificationLogSchema = new Schema(
  {
    parcelId: { type: Schema.Types.ObjectId, ref: "Parcel", required: true },
    channel: { type: String, enum: ["EMAIL", "SMS"], required: true },
    recipient: { type: String, required: true },
    templateKey: { type: String, required: true },
    status: { type: String, enum: ["SENT", "FAILED"], required: true },
    providerMessageId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationLogSchema.index({ parcelId: 1, createdAt: -1 });

export const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model("NotificationLog", notificationLogSchema);
