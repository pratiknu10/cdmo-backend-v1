import express from "express";

import {
  getEquipmentsByBID,
  getEquipmentDetail,
} from "../controllers/equipmentController.js";

export const equipmentRouter = express.Router();

equipmentRouter.get("/batch/:batchId", getEquipmentsByBID);
equipmentRouter.get("/:equipmentId", getEquipmentDetail);
