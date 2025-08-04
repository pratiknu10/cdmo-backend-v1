import express from "express";

import {
  batchDetailSummay,
  batchGenealogy,
  batchParentDetail,
  getBatchOverview,
  getDeviationsCapa,
  getEquipmentsDetailsByID,
  performBatchActions,
  sampleTests,
} from "../controllers/batchController.js";

// # user-story 11
const batchRouter = express.Router();
//  overview tab and summary table data
batchRouter.get("/batches/parent-detail/:batchId", batchParentDetail);
batchRouter.get("/batches/:batchId/detailed-summary", batchDetailSummay);
batchRouter.get("/batches/overview", getBatchOverview);
//  genealogy tab
batchRouter.get("/batches/:batchId/genealogy", batchGenealogy);
// sample tab
batchRouter.get("/batches/:batchId/samples-tests", sampleTests);
// deviation tab
batchRouter.get("/batches/:batchId/deviations-capa", getDeviationsCapa);
// equipment tab
batchRouter.get("/batches/:batchId/equipment", getEquipmentsDetailsByID);

batchRouter.put("/batches/:batchId/actions", performBatchActions);
export default batchRouter;
