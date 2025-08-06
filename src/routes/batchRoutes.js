import express from "express";

import {
  batchDetailSummay,
  batchGenealogy,
  batchParentDetail,
  GET_ALL_API_BATCH_ID,
  getBatchOverview,
  getDeviationsCapa,
  getEquipmentsDetailsByID,
  performBatchActions,
  releaseReport,
  sampleTests,
  stabilityReport,
} from "../controllers/batchController.js";

// # user-story 11
const batchRouter = express.Router();
//  overview tab and summary table data
batchRouter.get("/batches/stability-report/:apiBatchId", stabilityReport);
batchRouter.get("/batches/release-report/:apiBatchId", releaseReport);
batchRouter.get("/batches/api-ids", GET_ALL_API_BATCH_ID);
batchRouter.get("/batches/parent-detail/:batchId", batchParentDetail);
batchRouter.get("/batches/:batchId/detailed-summary", batchDetailSummay);
batchRouter.get("/batches/overview", getBatchOverview);
//  genealogy tab

// ________________________________________________________________
batchRouter.get("/batches/:batchId/genealogy", batchGenealogy);
// sample tab
batchRouter.get("/batches/:batchId/samples-tests", sampleTests);
// deviation tab
batchRouter.get("/batches/:batchId/deviations-capa", getDeviationsCapa);
// equipment tab
batchRouter.get("/batches/:batchId/equipment", getEquipmentsDetailsByID);

batchRouter.put("/batches/:batchId/actions", performBatchActions);
export default batchRouter;
