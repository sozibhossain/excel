import AppError from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../model/user.model.js";

export const protect =
  (optional = false) =>
  async (req, res, next) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    if (!token) {
      if (optional) {
        return next();
      }
      throw new AppError(401, "Authentication required");
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new Error("inactive");
      }
      req.user = user;
      return next();
    } catch (error) {
      return next(new AppError(401, "Invalid or expired token"));
    }
  };
