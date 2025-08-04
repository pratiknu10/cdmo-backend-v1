import mongoose from "mongoose";
const { Schema } = mongoose;

const BatchComponentSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    api_batch_id: { type: String, required: true, index: true }, // duplicated for human trace
    component_batch_id: { type: String, required: true, index: true },
    component_type: {
      type: String,
      // enum: ["Raw Material", "Intermediate", "Excipient", "API","Base"],
      required: true,
    },
    component_name: { type: String, required: true },

    material_code_component: String,
    supplier_name: String,
    supplier_lot_id: String,
    internal_lot_id: String,
    quantity_used: Number,
    uom: String,
    usage_ts: Date,

    coa: {
      received: Boolean,
      approval_date: Date,
      reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
    },
    qc: {
      status: {
        type: String,
        enum: ["Approved", "Rejected", "Pending"],
        default: "Approved",
      },
      approval_date: Date,
    },
  },
  { timestamps: true }
);

export const BatchComponentModel = mongoose.model(
  "BatchComponent",
  BatchComponentSchema
);
