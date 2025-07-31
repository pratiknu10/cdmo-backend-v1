import express from "express";
import genealogyController from "../controllers/genealogyController.js";

const genealogyRouter = express.Router();

// Main genealogy route
genealogyRouter.get(
  "/batches/:batchId/genealogy-table",
  genealogyController.getBatchGenealogy
);

// [ if it is red in color the user will click and we have to hit this api] Deviation-linked batch details popup
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
  "/deviations/:deviationId/details",
  genealogyController.getDeviationDetails
);

// Batch hierarchy/lineage
genealogyRouter.get(
  "/batches/:batchId/lineage",
  genealogyController.getBatchLineage
);
export default genealogyRouter;
