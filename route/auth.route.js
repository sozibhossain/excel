import express from "express";
import {
  login,
  logout,
  me,
  refreshSession,
  register,
} from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", protect(true), register);
router.post("/login", login);
router.post("/refresh", refreshSession);
router.post("/logout", protect(), logout);
router.get("/me", protect(), me);

export default router;
