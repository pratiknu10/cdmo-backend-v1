// routes/dashboardRoutes.js
import express from "express";
import {
  getDashboardSummary,
  getCustomerBatchSummary,
} from "../controllers/dashboardController.js";

const router = express.Router();
// # user-story-9
router.get("/summary", getDashboardSummary);
router.get("/customers", getCustomerBatchSummary);

export default router;
