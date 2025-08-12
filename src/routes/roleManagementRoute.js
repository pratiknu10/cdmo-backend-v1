// routes/roles.js
import express from "express";
import Role from "../models/Role.js";
import { checkAuth, hasPermission } from "../middleware/authMiddleware.js";

const roleManagementRouter = express.Router();

// GET all roles (for the grid) - Protected so only admins can see it
roleManagementRouter.get(
  "/",
  [checkAuth, hasPermission("Settings", "canView")],
  async (req, res) => {
    const roles = await Role.find({});
    res.json(roles);
  }
);

// UPDATE a role's permissions
roleManagementRouter.put(
  "/:id",
  [checkAuth, hasPermission("Settings", "canEdit")],
  async (req, res) => {
    const { permissions } = req.body;
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    );
    res.json(updatedRole);
  }
);

export default roleManagementRouter;
