import bcrypt from "bcryptjs";
import crypto from "crypto";

export const hashPassword = async (password) => bcrypt.hash(password, 10);

export const verifyPassword = async (hash, password) => bcrypt.compare(password, hash);

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
