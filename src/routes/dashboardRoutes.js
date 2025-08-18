// routes/dashboardRoutes.js
import express from "express";
import {
  getDashboardSummary,
  getCustomerBatchSummary,
} from "../controllers/dashboardController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
// # user-story-9
router.get("/summary", authenticateToken, getDashboardSummary);
router.get("/customers", authenticateToken, getCustomerBatchSummary);

export default router;
