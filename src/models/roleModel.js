// models/Role.js
import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    resource: { type: String, required: true }, // e.g., 'Reports', 'Client Profile'
    canView: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canAddDel: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    permissions: [permissionSchema],
});

const RoleModel = mongoose.model("Role", roleSchema);
export default RoleModel;
