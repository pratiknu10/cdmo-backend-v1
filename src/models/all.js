import mongoose from "mongoose";
const { Schema } = mongoose;

const BatchComponentSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    api_batch_id: { type: String, required: true, index: true }, // duplicated for human trace
    component_batch_id: { type: String, required: true, index: true },
    component_type: {
      type: String,
      enum: ["Raw Material", "Intermediate", "Excipient", "API"],
      required: true,
    },
    component_name: { type: String, required: true },

    material_code_component: String,
    supplier_name: String,
    supplier_lot_id: String,
    internal_lot_id: String,
    quantity_used: Number,
    uom: String,
    usage_ts: Date,

    coa: {
      received: Boolean,
      approval_date: Date,
      reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
    },
    qc: {
      status: {
        type: String,
        enum: ["Approved", "Rejected", "Pending"],
        default: "Approved",
      },
      approval_date: Date,
    },
  },
  { timestamps: true }
);

export const BatchComponentModel = mongoose.model(
  "BatchComponent",
  BatchComponentSchema
);


import mongoose from "mongoose";
const { Schema } = mongoose;

const BatchSchema = new Schema(
  {
    api_batch_id: { type: String, unique: true, required: true, index: true },
    status: {
      type: String,
      enum: ["In-Process", "Released", "Rejected", "On-Hold"],
      default: "In-Process",
    },

    customer: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", index: true },

    // HARD REFS (arrays)
    components: [{ type: Schema.Types.ObjectId, ref: "BatchComponent" }],
    process_steps: [{ type: Schema.Types.ObjectId, ref: "ProcessStep" }],
    samples: [{ type: Schema.Types.ObjectId, ref: "Sample" }],
    deviations: [{ type: Schema.Types.ObjectId, ref: "Deviation" }],
    equipment_events: [{ type: Schema.Types.ObjectId, ref: "EquipmentEvent" }],

    released_at: Date,
    released_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const BatchModel = mongoose.model("Batch", BatchSchema);


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


import mongoose from "mongoose";
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    country: String,
    contact_person: String,
    email: String,
    phone: String,
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model("Customer", CustomerSchema);


import mongoose from "mongoose"; const { Schema } = mongoose;  const LinkedEntitySchema = new Schema(   {     entity_type: {       type: String,       enum: ["Batch", "Sample", "Test", "ProcessStep", "Equipment"],       required: true,     },     batch: { type: Schema.Types.ObjectId, ref: "Batch" },     sample: { type: Schema.Types.ObjectId, ref: "Sample" },     test_result: { type: Schema.Types.ObjectId, ref: "TestResult" },     process_step: { type: Schema.Types.ObjectId, ref: "ProcessStep" },     equipment: { type: String, ref: "Equipment" },   },   { _id: false } );  const DeviationSchema = new Schema(   {     deviation_no: { type: String, unique: true, required: true, index: true },     batch: {       type: Schema.Types.ObjectId,       ref: "Batch",       required: true,       index: true,     },     api_batch_id: { type: String, required: true, index: true },      title: { type: String, required: true },     description: String,     severity: {       type: String,       enum: ["Minor", "Major", "Critical"],       required: true,     },     status: {       type: String,       enum: ["Open", "Closed", "In-Progress"],       default: "Open",     },     raised_by: { type: Schema.Types.ObjectId, ref: "User", required: true },     raised_at: { type: Date, default: Date.now },      linked_entity: LinkedEntitySchema,      resolution: {       action_taken: String,       closed_by: { type: Schema.Types.ObjectId, ref: "User" },       closed_at: Date,       linked_capa: { type: Schema.Types.ObjectId, ref: "CAPA" },     },   },   { timestamps: true } );  export const DeviationModel = mongoose.model("Deviation", DeviationSchema); "

import mongoose from "mongoose";
const { Schema } = mongoose;

const EquipmentEventSchema = new Schema(
  {
    equipment: { type: String, ref: "Equipment", required: true, index: true },
    event_type: {
      type: String,
      enum: ["Usage", "Calibration", "Cleaning", "Maintenance", "Fault"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },

    related_batch: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    related_process_step: { type: Schema.Types.ObjectId, ref: "ProcessStep" },

    notes: String,
  },
  { timestamps: true }
);

export const EquipmentEventModel = mongoose.model(
  "EquipmentEvent",
  EquipmentEventSchema
);


import mongoose from "mongoose";
const { Schema } = mongoose;

// using string PK (equipment_id) as _id
const EquipmentSchema = new Schema(
  {
    _id: { type: String, required: true }, // equipment_id
    name: String,
    model: String,
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
      enum: ["Available", "In Use", "Maintenance", "Faulted"],
      default: "Available",
    },
  },
  { timestamps: true }
);

export const EquipmentModel = mongoose.model("Equipment", EquipmentSchema);


// models/processStep.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const EquipmentStatusSchema = new Schema(
  {
    equipment: { type: String, ref: "Equipment", required: true }, // equipment_id as string PK
    equipment_status: {
      type: String,
      enum: ["Clean", "Calibrated", "In Use", "Faulted"],
      required: true,
    },
    calibration_status: {
      type: String,
      enum: ["Valid", "Expired", "N/A"],
      required: true,
    },
    last_cleaned_on: Date,
    last_calibrated_on: Date,
    qa_approval_status: {
      type: String,
      enum: ["Approved", "Rejected", "Hold"],
      required: true,
    },
    qa_reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const ProcessStepSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    api_batch_id: { type: String, required: true, index: true }, // duplicate for readability

    step_name: { type: String, required: true },
    step_sequence: { type: Number, required: true, index: true },
    start_timestamp: { type: Date, required: true },
    end_timestamp: { type: Date, required: true },

    equipment: [EquipmentStatusSchema],

    qa_approval_status: {
      type: String,
      enum: ["Approved", "Rejected", "Hold"],
      default: "Approved",
    },
    qa_reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ProcessStepModel = mongoose.model(
  "ProcessStep",
  ProcessStepSchema
);


import mongoose from "mongoose";
const { Schema } = mongoose;

const ProjectSchema = new Schema(
  {
    project_code: { type: String, required: true, unique: true, index: true },
    project_name: { type: String, required: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Ongoing", "Completed", "On-Hold"],
      default: "Ongoing",
    },
    start_date: Date,
    end_date: Date,

    batches: [{ type: Schema.Types.ObjectId, ref: "Batch" }],
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.model("Project", ProjectSchema);


import mongoose from "mongoose";
const { Schema } = mongoose;

const SampleSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    api_batch_id: { type: String, required: true, index: true },

    sample_id: { type: String, unique: true, required: true, index: true },
    sample_type: {
      type: String,
      enum: ["In-Process", "Finished Product", "Stability"],
      required: true,
    },
    collected_at: Date,
    collected_by: { type: Schema.Types.ObjectId, ref: "User" },
    storage_location: String,
    remarks: String,

    // Child refs
    test_results: [{ type: Schema.Types.ObjectId, ref: "TestResult" }],
  },
  { timestamps: true }
);

export const SampleModel = mongoose.model("Sample", SampleSchema);

import mongoose from "mongoose";
const { Schema } = mongoose;

const ReagentSchema = new Schema(
  {
    reagent_id: String,
    name: String,
    lot_no: String,
    expiry: Date,
  },
  { _id: false }
);

const TestResultSchema = new Schema(
  {
    sample: {
      type: Schema.Types.ObjectId,
      ref: "Sample",
      required: true,
      index: true,
    },
    sample_id: { type: String, required: true, index: true },

    test_id: { type: String, unique: true, required: true, index: true },
    method_id: String,
    parameter: { type: String, required: true },
    value: Number,
    unit: String,
    result: { type: String, enum: ["Pass", "Fail", "NA"], required: true },
    tested_at: { type: Date, required: true },
    tested_by: { type: Schema.Types.ObjectId, ref: "User" },

    equipment_used: [{ type: String, ref: "Equipment" }],
    reagents: [ReagentSchema],
    remarks: String,
  },
  { timestamps: true }
);

export const TestResultModel = mongoose.model("TestResult", TestResultSchema);


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


// use date timestamps  btwn 2019 to present date

 


