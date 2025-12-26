import "dotenv/config";
import { z } from "zod";

// Trim + strip inline comments: "value # comment" -> "value"
const clean = (v) => {
  if (v === undefined || v === null) return v;
  return String(v).split("#")[0].trim();
};

const cleanedString = () =>
  z.string().min(1).transform(clean).pipe(z.string().min(1)); // ensure non-empty after cleaning

const envSchema = z.object({
  NODE_ENV: z
    .string()
    .default("development")
    .transform(clean)
    .pipe(z.enum(["development", "test", "production"])),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_DB_URL: cleanedString().pipe(
    z.string().min(1, "MONGO_DB_URL is required")
  ),

  REDIS_URL: cleanedString().pipe(
    z.string().min(1, "REDIS_URL is required")
  ),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters")
    .transform(clean)
    .pipe(z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters")),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
    .transform(clean)
    .pipe(z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters")),

  JWT_ACCESS_EXPIRES_IN: z.string().default("15m").transform(clean),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d").transform(clean),

  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(150),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60),

  GOOGLE_MAPS_API_KEY: z.string().transform(clean).optional(),

  CLOUDINARY_CLOUD_NAME: cleanedString().pipe(
    z.string().min(1, "CLOUDINARY_CLOUD_NAME is required")
  ),
  CLOUDINARY_API_KEY: cleanedString().pipe(
    z.string().min(1, "CLOUDINARY_API_KEY is required")
  ),
  CLOUDINARY_API_SECRET: cleanedString().pipe(
    z.string().min(1, "CLOUDINARY_API_SECRET is required")
  ),

  CLIENT_URL: z.string().transform(clean).optional(),
  SOCKET_ALLOWED_ORIGINS: z.string().transform(clean).optional(),
  SMS_WEBHOOK_URL: z.string().transform(clean).optional(),
  SMS_WEBHOOK_TOKEN: z.string().transform(clean).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.table(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (!env.SOCKET_ALLOWED_ORIGINS && env.CLIENT_URL) {
  env.SOCKET_ALLOWED_ORIGINS = env.CLIENT_URL;
}

export default env;
