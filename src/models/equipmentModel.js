import mongoose from "mongoose";
const { Schema } = mongoose;

// using string PK (equipment_id) as _id
const EquipmentSchema = new Schema(
  {
    _id: { type: String, required: true }, // equipment_id
    name: String,
    model: String,
    equip_id: String,
    location: String,
    calibration_status: {
      type: String,
      enum: ["Valid", "Expired", "Due Soon"],
      default: "Valid",
    },
    last_calibrated_on: Date,
    last_cleaned_on: Date,
    
    status: {
      type: String,
      enum: [
        "Available",
        "In Use",
        "Maintenance",
        "Under Maintenance",
        "Faulted",
      ],
      default: "Available",
    },
  },
  { timestamps: true }
);

export const EquipmentModel = mongoose.model("Equipment", EquipmentSchema);
