import mongoose from "mongoose";
const { Schema } = mongoose;

const ProjectSchema = new Schema(
  {
    project_code: { type: String, required: true, unique: true, index: true },
    project_name: { type: String, required: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Ongoing", "Completed", "On-Hold"],
      default: "Ongoing",
    },
    start_date: Date,
    end_date: Date,

    batches: [{ type: Schema.Types.ObjectId, ref: "Batch" }],
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.model("Project", ProjectSchema);
