// ================================
// SAMPLES & TESTS API STRUCTURE
// ================================

// ================================
// 1. routes/samplesTestsRoutes.js
// ================================
// # user-story 13
import express from "express";
import samplesTestsController from "../controllers/samplesTestsController.js";

const sampleTestRoute = express.Router();

// Main samples & tests overview for a batch
sampleTestRoute.get(
  "/batches/:batchId/samples-tests",
  samplesTestsController.getBatchSamplesTests
);

// Sample overview KPIs
sampleTestRoute.get(
  "/batches/:batchId/samples-overview",
  samplesTestsController.getSampleOverview
);

// Test results table with filtering and pagination
sampleTestRoute.get(
  "/batches/:batchId/test-results",
  samplesTestsController.getTestResults
);

// Search and filter test results
sampleTestRoute.get(
  "/batches/:batchId/test-results/search",
  samplesTestsController.searchTestResults
);

// Export test results
sampleTestRoute.get(
  "/batches/:batchId/test-results/export",
  samplesTestsController.exportTestResults
);

// Individual sample details (for expansion/drill-down)
sampleTestRoute.get(
  "/samples/:sampleId/detailed-tests",
  samplesTestsController.getSampleDetailedTests
);

// Test result statistics
sampleTestRoute.get(
  "/batches/:batchId/test-statistics",
  samplesTestsController.getTestStatistics
);

export default sampleTestRoute;
