// models/processStep.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const EquipmentStatusSchema = new Schema(
  {
    equipment: { type: String, ref: "Equipment", required: true }, // equipment_id as string PK
    equipment_status: {
      type: String,
      enum: ["Clean", "Calibrated", "In Use", "Faulted"],
      required: true,
    },
    calibration_status: {
      type: String,
      enum: ["Valid", "Expired", "N/A"],
      required: true,
    },
    last_cleaned_on: Date,
    last_calibrated_on: Date,
    qa_approval_status: {
      type: String,
      enum: ["Approved", "Rejected", "Hold"],
      required: true,
    },
    qa_reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const ProcessStepSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    api_batch_id: { type: String, required: true, index: true }, // duplicate for readability

    step_name: { type: String, required: true },
    step_sequence: { type: Number, required: true, index: true },
    start_timestamp: { type: Date, required: true },
    end_timestamp: { type: Date, required: true },

    equipment: [EquipmentStatusSchema],

    qa_approval_status: {
      type: String,
      enum: ["Approved", "Rejected", "Hold"],
      default: "Approved",
    },
    qa_reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ProcessStepModel = mongoose.model(
  "ProcessStep",
  ProcessStepSchema
);
