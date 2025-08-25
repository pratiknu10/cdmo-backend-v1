import mongoose from "mongoose";
const { Schema } = mongoose;

const BatchSchema = new Schema(
  {
    api_batch_id: { type: String, unique: true, required: true, index: true },
    status: {
      type: String,
      enum: [
        "In-Process",
        "Released",
        "Rejected",
        "On-Hold",
        "Completed",
        "QA Hold",
        "Not Started",
      ],
      default: "In-Process",
    },
    product_name: { type: String },
    manufacturing_id: { type: String },
    plant_location: {
      type: String,
    },
    target_yield: { type: Number },
    actual_yield: { type: Number },
    yield_unit: { type: String },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    batch_size: {
      quantity: Number,
      unit: String,
    },
    // HARD REFS (arrays)
    components: [{ type: Schema.Types.ObjectId, ref: "BatchComponent" }],
    process_steps: [{ type: Schema.Types.ObjectId, ref: "ProcessStep" }],
    samples: [{ type: Schema.Types.ObjectId, ref: "Sample" }],
    deviations: [{ type: Schema.Types.ObjectId, ref: "Deviation" }],
    equipment_events: [{ type: Schema.Types.ObjectId, ref: "EquipmentEvent" }],
    datasource: { type: String, enum: ["ERP", "MES", "LIMS", "QMS"] },
    targeted_end_date: { type: Date },
    released_at: Date,
    released_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const BatchModel = mongoose.model("Batch", BatchSchema);
