// ================================
// Customer Batch Management APIs
// ================================

import express from "express";

import {
  batchReleaseActionByID,
  customerBatchQueryByID,
  exportBatchByCustomerID,
  getBatchIdDetailByID,
  getBatchSummaryByCustomerId,
  updateBatchStatusByUserID,
} from "../controllers/customerBatchController.js";

// https://nu-10.atlassian.net/browse/CQN-10
// # user-story-10
const customerBatchRoutes = express.Router();

// ================================
// 1. GET CUSTOMER BATCH SUMMARY
// Route: GET /api/customers/:customerId/batch-summary
// Purpose: Get summary widgets and batch table for selected customer
// ================================
customerBatchRoutes.get(
  "/customers/:customerId/batch-summary",
  getBatchSummaryByCustomerId
);

// ================================
// 2. GET BATCH DETAILS
// Route: GET /api/batches/:batchId/details
// Purpose: Get detailed batch information for View action
// ================================

customerBatchRoutes.get("/batches/:batchId/details", getBatchIdDetailByID);

// ================================
// 4. SEARCH BATCHES
// Route: GET /api/customers/:customerId/batches/search
// Purpose: Advanced search functionality
// ================================

customerBatchRoutes.get(
  "/customers/:customerId/batches/search",
  customerBatchQueryByID
);
// 6. EXPORT CUSTOMER BATCHES
// Route: GET /api/customers/:customerId/batches/export
// Purpose: Export batch data for reporting
// ================================

customerBatchRoutes.get(
  "/customers/:customerId/batches/export",
  exportBatchByCustomerID
);

// ----------------------------------------- XXXXXXXXX ------------------------------------------------
// 0
// 0
// 0
// ================================
// 5. BATCH STATUS UPDATE
// Route: PUT /api/batches/:batchId/status
// Purpose: Update batch status (for admin actions)
// ================================
customerBatchRoutes.put("/batches/:batchId/status", updateBatchStatusByUserID);

// ================================
// 3. BATCH RELEASE ACTION
// Route: PUT /api/batches/:batchId/release
// Purpose: Release a batch (change status to Released)
// ================================

customerBatchRoutes.put("/batches/:batchId/release", batchReleaseActionByID);
export default customerBatchRoutes;
