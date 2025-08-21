import mongoose from "mongoose";
const { Schema } = mongoose;

const ReagentSchema = new Schema(
  {
    reagent_id: String,
    name: String,
    lot_no: String,
    expiry: Date,
  },
  { _id: false }
);

const TestResultSchema = new Schema(
  {
    sample: {
      type: Schema.Types.ObjectId,
      ref: "Sample",
      required: true,
      index: true,
    },
    sample_id: { type: String, required: true, index: true },

    test_id: { type: String, unique: true, required: true, index: true },
    method_id: String,
    parameter: { type: String, required: true },
    value: Number,
    test_status: String,
    unit: String,
    entry_time: Date,
    approver: String,
    // result: { type: String, enum: ["Pass", "Fail", "NA"], required: true },
    tested_at: { type: Date, required: true },
    tested_by: { type: Schema.Types.ObjectId, ref: "User" },
    specification: String,
    equipment_used: [{ type: String, ref: "Equipment" }],
    reagents: [ReagentSchema],
    remarks: String,
  },
  { timestamps: true }
);

export const TestResultModel = mongoose.model("TestResult", TestResultSchema);
