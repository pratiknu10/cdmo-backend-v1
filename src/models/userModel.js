import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, index: true },
    role: {
      type: String,
      enum: ["Operator", "Analyst", "QA", "Supervisor", "Admin"],
      required: true,
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);
