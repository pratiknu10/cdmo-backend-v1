import express from "express";
import {
  assignUser,
  createAdmin,
  createRole,
  getRoles,
  updatePermissions,
  users,
} from "../controllers/adminController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
const adminRouter = express.Router();
adminRouter.post("/assign-users", authenticateToken, isAdmin, assignUser);
adminRouter.post("/register", createAdmin);
adminRouter.post("/users", authenticateToken, isAdmin, users);
adminRouter.get("/roles", authenticateToken, isAdmin, getRoles);
adminRouter.post("/roles", authenticateToken, isAdmin, createRole);

adminRouter.post(
  "/users/:id/permissions",
  authenticateToken,
  isAdmin,
  updatePermissions
);

export default adminRouter;
