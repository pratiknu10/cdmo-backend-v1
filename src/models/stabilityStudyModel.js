import mongoose from "mongoose";

const StabilityStudySchema = new mongoose.Schema(
  {
    study_type: {
      type: String,
      required: true,
      enum: ["Accelerated", "Long-Term", "Intermediate", "Forced Degradation"],
    },
    storage_conditions: {
      type: String,
      required: true,
      trim: true,
    },
    study_start_date: {
      type: Date,
      required: true,
    },
    // Link to the Project or Product this study is for
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    // Optional: if a study is specific to a batch, link it here
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: false,
    },
    test_methods: [
      {
        test_name: { type: String, required: true },
        method_name: { type: String, required: true },
        specifications: { type: String, required: true }, // e.g., "NMT 0.5%", "98.0% - 102.0%"
        timepoints: [{ type: String, required: true }], // e.g., "0M", "3M", "6M", "12M"
      },
    ],
    // You might add fields for overall conclusion, status, etc.
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

export const StabilityStudyModel = mongoose.model(
  "StabilityStudy",
  StabilityStudySchema
);
