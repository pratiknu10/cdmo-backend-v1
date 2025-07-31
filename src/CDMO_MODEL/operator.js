import mongoose from "mongoose";

export const operatorSchema = new mongoose.Schema(
  {
    operator_id: { type: String, required: true },
    operator_role: { type: String, required: true },
  },
  { _id: false }
);
export const Operator = mongoose.model("Operator", operatorSchema);
