import AppError from "../errors/AppError.js";

const rbac =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "Forbidden");
    }
    next();
  };

export default rbac;
