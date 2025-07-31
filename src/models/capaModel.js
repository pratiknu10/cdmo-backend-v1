import mongoose from "mongoose";
const { Schema } = mongoose;

const CAPASchema = new Schema(
  {
    title: String,
    description: String,
    status: {
      type: String,
      enum: ["Open", "Closed", "In-Progress"],
      default: "Open",
    },
    opened_at: { type: Date, default: Date.now },
    closed_at: Date,
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const CapaModel = mongoose.model("CAPA", CAPASchema);
