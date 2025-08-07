import express from "express";

import {
  getEquipmentsByBID,
  getEquipmentDetail,
  exportEquipmentsReport,
} from "../controllers/equipmentController.js";

export const equipmentRouter = express.Router();

equipmentRouter.get("/batch/:batchId", getEquipmentsByBID);
equipmentRouter.get("/:equipmentId", getEquipmentDetail);
equipmentRouter.get("/report/export", exportEquipmentsReport);

