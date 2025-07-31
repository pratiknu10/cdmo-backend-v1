import mongoose from "mongoose";
const { Schema } = mongoose;

const EquipmentEventSchema = new Schema(
  {
    equipment: { type: String, ref: "Equipment", required: true, index: true },
    event_type: {
      type: String,
      enum: ["Usage", "Calibration", "Cleaning", "Maintenance", "Fault"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },

    related_batch: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    related_process_step: { type: Schema.Types.ObjectId, ref: "ProcessStep" },

    notes: String,
  },
  { timestamps: true }
);

export const EquipmentEventModel = mongoose.model(
  "EquipmentEvent",
  EquipmentEventSchema
);
