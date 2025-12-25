import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../config/redis.js";
import env from "../config/env.js";
import AppError from "../errors/AppError.js";

const limiter = new RateLimiterRedis({
  storeClient: redis,
  points: env.RATE_LIMIT_POINTS,
  duration: env.RATE_LIMIT_DURATION,
  keyPrefix: "rate",
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    const key = req.user?._id?.toString() || req.ip;
    await limiter.consume(key);
    next();
  } catch (error) {
    next(new AppError(429, "Too many requests"));
  }
};

export default rateLimitMiddleware;
