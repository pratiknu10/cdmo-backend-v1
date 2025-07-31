import mongoose from "mongoose";

import { batchSchema } from "./batch.js";

import { equipmentSchema } from "./equipment.js";
import { operatorSchema } from "./operator.js";
import { sampleSchema } from "./sample.js";

const processSchema = new mongoose.Schema({
  process_stage: { type: String, required: true },
  step_sequence: { type: Number, required: true },
  start_timestamp: { type: Date, required: true },
  end_timestamp: { type: Date, required: true },

  equipment: equipmentSchema,

  operator: operatorSchema,

  target_temperature: { type: Number },
  actual_temperature: { type: Number },
  target_pressure: { type: Number },
  actual_pressure: { type: Number },

  step_result: { type: String, enum: ["Passed", "Failed"], required: true },
  step_exception_flag: { type: Boolean, default: false },
  review_by_exception_flag: { type: Boolean, default: false },

  qa_review_status: { type: String },
  qa_reviewed_by: { type: String },
  qa_review_timestamp: { type: Date },

  samples: [sampleSchema], // Embedded samples
  batch: batchSchema, // Embedded batch
});

const processStepSchema = new mongoose.Schema({
  process: { type: [processSchema], required: true },
});

export const ProcessStep = mongoose.model("ProcessStep", processStepSchema);
