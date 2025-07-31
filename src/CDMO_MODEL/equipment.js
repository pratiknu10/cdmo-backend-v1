import mongoose from "mongoose";

export const equipmentSchema = new mongoose.Schema({
  equipment_id: String,
  equipment_name: String,
  category: String,
  location: String,
  status: String,
  last_maintenance_date: Date,
  next_maintenance_due: Date,
  calibration_status: String,
  calibration_due_on: Date,
});

export const Equipment = mongoose.model("Equipment", equipmentSchema);
