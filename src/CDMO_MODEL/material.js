import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  material_code: String,
  material_name: String,
  type: String,
  description: String,
});

export const Material = mongoose.model("Material", materialSchema);
