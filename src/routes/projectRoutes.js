import express from "express";
import { verifyToken } from "../middleware/authentication.js";
import {
  updateProject,
  viewProject,
} from "../controllers/projectController.js";
const router = express.Router();
  router.get("/:id", verifyToken, viewProject);
  router.put("/:id", verifyToken, updateProject);
export default router;
