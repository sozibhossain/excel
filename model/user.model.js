import mongoose, { Schema } from "mongoose";

export const RoleEnum = ["ADMIN", "AGENT", "CUSTOMER"];
export const LanguageEnum = ["EN", "BN"];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: RoleEnum, default: "CUSTOMER" },
    language: { type: String, enum: LanguageEnum, default: "EN" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
