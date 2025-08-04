import mongoose from "mongoose";
const { Schema } = mongoose;

const SampleSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    batch_component_ID: { type: Schema.Types.ObjectId, ref: "BatchComponent" },
    api_batch_id: { type: String, required: true, index: true },

    sample_id: { type: String, unique: true, required: true, index: true },
    sample_type: {
      type: String,
      enum: ["In-Process", "Finished Product", "Stability"],
      required: true,
    },
    collected_at: Date,
    collected_by: { type: Schema.Types.ObjectId, ref: "User" },
    storage_location: String,
    remarks: String,

    // Child refs
    test_results: [{ type: Schema.Types.ObjectId, ref: "TestResult" }],
  },
  { timestamps: true }
);

export const SampleModel = mongoose.model("Sample", SampleSchema);
