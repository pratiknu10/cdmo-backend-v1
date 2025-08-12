// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Remember to hash passwords!
    email: { type: String, required: true },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    // Example attribute for ABAC
    department: { type: String },
    projectAssignments: [
      {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
        assignedRole: {
          type: String,
          enum: ["Project Manager", "Lab Authority", "Quality Authority"],
        },
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
