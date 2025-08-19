import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: String,
      enum: ["info", "warn", "error"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    method: {
      type: String,
    },
    url: {
      type: String,
    },
    status: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userEmail: {
      type: String,
      required: false,
    },
    userRole: {
      type: String,
      required: false,
    },
    effectedEntity: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
  }
);
export const LogModel = mongoose.model("Log", logSchema);
