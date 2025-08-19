import express from "express";
import { getLogs } from "../controllers/logController.js";
export const logRouter = express.Router();

logRouter.get("/", getLogs);
