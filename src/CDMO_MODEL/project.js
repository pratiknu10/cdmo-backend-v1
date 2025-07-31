import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  project_code: String,
  customer_id: String,
  material_code: String,
  material_name: String,
  status: String,
  start_date: Date,
  end_date: Date,
});

export const Project = mongoose.model("Project", projectSchema);
