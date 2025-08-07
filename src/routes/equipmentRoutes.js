import express from "express";

import { getEquipmentsByBID } from "../controllers/equipmentController.js";

export const equipmentRouter = express.Router();

equipmentRouter.get("/batch/:batchId", getEquipmentsByBID);
