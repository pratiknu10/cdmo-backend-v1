import mongoose from "mongoose";
const { Schema } = mongoose;

const LinkedEntitySchema = new Schema(
  {
    entity_type: {
      type: String,
      enum: [
        "Batch",
        "Sample",
        "TestResult",
        "ProcessStep",
        "Equipment",
        "BatchComponent",
      ],
      required: true,
    },
    batch: { type: Schema.Types.ObjectId, ref: "Batch" },
    sample: { type: Schema.Types.ObjectId, ref: "Sample" },
    test_result: { type: Schema.Types.ObjectId, ref: "TestResult" },
    process_step: { type: Schema.Types.ObjectId, ref: "ProcessStep" },
    batch_component: { type: Schema.Types.ObjectId, ref: "BatchComponent" },
    equipment: { type: String, ref: "Equipment" },
  },
  { _id: false }
);

const DeviationSchema = new Schema(
  {
    deviation_no: { type: String, unique: true, required: true, index: true },
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    api_batch_id: { type: String, required: true, index: true },

    title: { type: String, required: true },
    description: String,
    severity: {
      type: String,
      enum: ["Minor", "Major", "Critical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed", "In-Progress"],
      default: "Open",
    },
    raised_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    raised_at: { type: Date, default: Date.now },

    linked_entity: LinkedEntitySchema,

    resolution: {
      action_taken: String,
      closed_by: { type: Schema.Types.ObjectId, ref: "User" },
      closed_at: Date,
      linked_capa: { type: Schema.Types.ObjectId, ref: "CAPA" },
    },
  },
  { timestamps: true }
);

export const DeviationModel = mongoose.model("Deviation", DeviationSchema);
