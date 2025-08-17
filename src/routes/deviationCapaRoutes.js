// # user-story 14

import express from "express";
import deviationCapaController from "../controllers/deviationCapaController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const DeviationCapaRouter = express.Router();

// ___ FOR FETCHING ALL DEVIATIONS WITHOUT LINKED ENTITES _____
DeviationCapaRouter.get(
  "/deviations/overview",
  authenticateToken,
  deviationCapaController.deviationsOverview
);
// ___ FOR FETCHING DEVIATION LINKED ENTITES  _____

DeviationCapaRouter.get(
  "/deviations/linked/:deviationNo",
  authenticateToken,
  deviationCapaController.deviationLinkedEntity
);
// ___ FOR EXPORTING ALL DEVIATIONS WITH LINKED ENTITES _____
DeviationCapaRouter.get(
  "/deviations/overview/export",
  authenticateToken,
  deviationCapaController.exportDeviationsOverview
);
DeviationCapaRouter.get(
  "/deviations/:deviationNo",
  deviationCapaController.getCapaDeviationDetails
);

DeviationCapaRouter.get(
  "/deviations",
  deviationCapaController.getCapaDeviations
);

// _______________________________________________________________
// Main deviation & CAPA overview for a batch
DeviationCapaRouter.get(
  "/batches/:batchId/deviations-capa",
  deviationCapaController.getBatchDeviationsCapa
);

// Deviation summary KPIs
DeviationCapaRouter.get(
  "/batches/:batchId/deviations-summary",
  deviationCapaController.getDeviationSummary
);

// Deviation mapping table with filtering and pagination
DeviationCapaRouter.get(
  "/batches/:batchId/deviations-table",
  deviationCapaController.getDeviationsTable
);

// Search and filter deviations
DeviationCapaRouter.get(
  "/batches/:batchId/deviations/search",
  deviationCapaController.searchDeviations
);

// Individual deviation details (read-only panel)
// DeviationCapaRouter.get(
//   "/deviations/:deviationId/details",
//   deviationCapaController.getDeviationDetails
// );

// CAPA details linked to deviation
// DeviationCapaRouter.get(
//   "/deviations/:deviationId/capa",
//   deviationCapaController.getDeviationCapa
// );

// Export deviations data
DeviationCapaRouter.get(
  "/batches/:batchId/deviations/export",
  deviationCapaController.exportDeviations
);

// Deviation statistics and trends
// DeviationCapaRouter.get(
//   "/batches/:batchId/deviation-statistics",
//   deviationCapaController.getDeviationStatistics
// );

export default DeviationCapaRouter;
