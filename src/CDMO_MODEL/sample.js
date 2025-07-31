import mongoose from "mongoose";

const reagentSchema = new mongoose.Schema({
  reagent_id: String,
  reagent_name: String,
  reagent_batch_no: String,
  reagent_expiry_date: Date,
  reagent_status: String,
  used_by: String,
  used_on: Date,
  coa_received: Boolean,
  coa_approval_date: Date,
  qa_status: String,
  qa_reviewed_by: String,
  qa_approval_timestamp: Date,
});

const equipmentUsedSchema = new mongoose.Schema({
  equipment_id: String,
  equipment_type: String,
  serial_number: String,
  calibration_status: String,
  used_on: Date,
  used_by: String,
  equipment_status: String,
  qa_approval_status: String,
  qa_reviewed_by: String,
  qa_approval_timestamp: Date,
});

const testSchema = new mongoose.Schema({
  test_id: String,
  sample_id: String,
  test_name: String,
  test_method: String,
  result_value: String,
  result_unit: String,
  result_status: String,
  specification_range: String,
  test_timestamp: Date,
  analyst_id: String,
  approval_status: String,
  Reagents: [reagentSchema],
  Equipment_Id: [equipmentUsedSchema],
});

export const sampleSchema = new mongoose.Schema({
  sample_id: String,
  api_batch_id: String,
  Sampling_point: String,
  sample_type: String,
  sample_status: String,
  sample_collected_on: Date,
  sample_collected_by: String,
  approval_status: String,
  QA_Review_By: String,
  QA_Approval_Timestamp: Date,
  Test: [testSchema],
});

export const Sample = mongoose.model("Sample", sampleSchema);
