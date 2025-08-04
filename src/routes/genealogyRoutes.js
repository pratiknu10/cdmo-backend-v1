import express from "express";
import genealogyController from "../controllers/genealogyController.js";

const genealogyRouter = express.Router();
// # user-story-12
// Main genealogy route
genealogyRouter.get(
  "/batches/:batchId/genealogy-table",
  genealogyController.getBatchGenealogy
);

// [ if it is red in color the user will click and we have to hit this api] Deviation-linked batch details popup

// Get batch details popup
genealogyRouter.get(
  "/batches/:batchId/batch-popup-details",
  genealogyController.getBatchPopupDetails
);

genealogyRouter.get(
  "/batches/:batchId/deviation-linked-details",
  genealogyController.getDeviationLinkedBatchDetails
);

// Sample details for popup
genealogyRouter.get(
  "/samples/:sampleId/details",
  genealogyController.getSampleDetails
);

// Deviation details for popup
genealogyRouter.get(
  "/deviations/popup/:deviationId/details",
  genealogyController.getBatchPopupDetails
);

// Batch hierarchy/lineage
genealogyRouter.get(
  "/batches/:batchId/lineage",
  genealogyController.getBatchLineage
);
export default genealogyRouter;
