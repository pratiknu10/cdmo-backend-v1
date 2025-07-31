// ====================
// 1. package.json
// ====================
// {
//   "name": "cdmo-data-generator",
//   "version": "1.0.0",
//   "description": "CDMO Bulk Data Generator with Mongoose",
//   "main": "generate-data.js",
//   "type": "module",
//   "scripts": {
//     "generate": "node generate-data.js",
//     "start": "node generate-data.js",
//     "dev": "node generate-data.js"
//   },
//   "dependencies": {
//     "mongoose": "^8.0.0"
//   },
//   "author": "CDMO Team",
//   "license": "MIT"
// }

// ====================
// 2. generate-data.js
// ====================
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const { ObjectId } = mongoose.Types;

// Helper function to generate valid ObjectIds
function generateObjectId() {
  return new ObjectId().toString();
}

// Helper function to generate random date between 2019 and present
function randomDate(start = new Date("2019-01-01"), end = new Date()) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to add days to date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// API Molecules mapping
const apiMolecules = [
  {
    code: "API-PAR",
    name: "Paracetamol",
    steps: 9,
    processSteps: [
      "Raw‑Material Dispensing",
      "p‑Aminophenol Dissolution",
      "Acetylation (Acetic Anhydride)",
      "Reaction Quench & Cool",
      "Crystallisation",
      "Centrifuge & Wash",
      "Fluid‑Bed Drying",
      "Milling (D90 ≤ 150 µm)",
      "In‑Process QC",
    ],
  },
  {
    code: "API-IBU",
    name: "Ibuprofen",
    steps: 10,
    processSteps: [
      "Isobutylbenzene Acylation",
      "Quench & Aqueous Work‑Up",
      "Catalytic Hydrogenation",
      "Oxidation / Rearrangement",
      "Hydrolysis to Ibuprofen Acid",
      "Resolution (S‑Ibuprofen)",
      "Crystallisation",
      "Centrifuge / Wash",
      "Tray Drying",
      "Milling & Final QC",
    ],
  },
  {
    code: "API-ATC",
    name: "Atorvastatin Calcium",
    steps: 10,
    processSteps: [
      "Protected Lactone Hydrolysis",
      "Side‑Chain Esterification",
      "Chiral Base Formation",
      "Lactonisation",
      "Crude Crystallisation",
      "Wet‑Cake Centrifuge",
      "Calcium Salt Formation",
      "Re‑Crystallisation (IPA/Water)",
      "Vacuum Drying",
      "Micronisation (D90 ≤ 10 µm)",
    ],
  },
  {
    code: "API-MET",
    name: "Metformin HCl",
    steps: 9,
    processSteps: [
      "Charge Dicyandiamide",
      "Dimethylamine Addition",
      "Condensation Hold",
      "Quench & Cool",
      "HCl Salt Formation",
      "Crystallisation",
      "Centrifuge & Wash",
      "Tray Drying",
      "Blending (Pre‑Milling)",
    ],
  },
  {
    code: "API-AML",
    name: "Amlodipine Besylate",
    steps: 10,
    processSteps: [
      "Hantzsch Condensation",
      "Cooling & pH Adjustment",
      "Crude Crystallisation",
      "Centrifuge",
      "Hydrogenation (Nitro→Amine)",
      "Base Neutralisation",
      "Besylate Salt Formation",
      "Re‑Crystallisation (MeOH)",
      "Vacuum Drying",
      "Milling & Potency Check",
    ],
  },
  {
    code: "API-SOF",
    name: "Sofosbuvir",
    steps: 10,
    processSteps: [
      "Uridine Activation",
      "Coupling with Phosphoramidate",
      "Stereoselective Fluorination",
      "Deprotection (Base Labile)",
      "Phosphonate Ester Hydrolysis",
      "Crude Work‑Up & Separation",
      "Seeded Crystallisation",
      "Centrifuge (HPAPI Isolator)",
      "Contained Vacuum Drying",
      "Micronisation (Isolator)",
    ],
  },
  {
    code: "API-SIT",
    name: "Sitagliptin Phosphate",
    steps: 9,
    processSteps: [
      "Asymmetric Hydrogenation",
      "Crude Work‑Up",
      "Boc De‑protection",
      "Seed Crystallisation (Free Base)",
      "Centrifuge",
      "Phosphate Salt Formation",
      "Re‑Crystallisation (EtOAc)",
      "Vacuum Drying",
      "Milling / PSD Check",
    ],
  },
  {
    code: "API-OLA",
    name: "Olanzapine",
    steps: 9,
    processSteps: [
      "Thiophene Nitrile Formation",
      "Cyclisation to Diazepine Core",
      "N‑Methylation",
      "De‑chlorination / Work‑Up",
      "Crystallisation (Light‑Protected)",
      "Centrifuge (Dark‑Room)",
      "Nitrogen‑Purged Drying",
      "Micronisation",
      "Final QC",
    ],
  },
];

// Equipment mapping for each API
const equipmentMapping = {
  "API-PAR": [
    "WB-01",
    "R-101",
    "R-101",
    "R-101",
    "CJ-01",
    "CF-01",
    "FBD-02",
    "MIL-03",
    "QC-Lab",
  ],
  "API-IBU": [
    "GLR-201",
    "SEP-02",
    "H2-Reactor",
    "GLR-202",
    "GLR-202",
    "CHR-Skid",
    "CJ-04",
    "CF-02",
    "Oven-01",
    "MIL-05",
  ],
  "API-ATC": [
    "GLR-301",
    "GLR-302",
    "GLR-302",
    "GLR-303",
    "CJ-07",
    "CF-07",
    "GLR-304",
    "CJ-08",
    "VTD-02",
    "JET-01",
  ],
  "API-MET": [
    "R-401",
    "R-401",
    "R-401",
    "R-401",
    "R-402",
    "CJ-10",
    "CF-10",
    "Oven-03",
    "BL-01",
  ],
  "API-AML": [
    "GLR-501",
    "GLR-501",
    "CJ-12",
    "CF-12",
    "H2-Skid-2",
    "GLR-502",
    "GLR-502",
    "CJ-13",
    "VTD-03",
    "MIL-09",
  ],
  "API-SOF": [
    "GLR-601",
    "GLR-602",
    "GLR-603",
    "GLR-602",
    "GLR-604",
    "SEP-10",
    "CJ-15",
    "CF-15-ISO",
    "VTD-HP-01",
    "JET-HP-01",
  ],
  "API-SIT": [
    "H2-Skid-5",
    "SEP-12",
    "GLR-701",
    "CJ-17",
    "CF-17",
    "GLR-702",
    "CJ-18",
    "VTD-04",
    "MIL-11",
  ],
  "API-OLA": [
    "GLR-801",
    "GLR-802",
    "GLR-803",
    "SEP-15",
    "CJ-20",
    "CF-20-DR",
    "VTD-05-N2",
    "JET-03",
    "QC-Lab-B",
  ],
};

// Generate Users
const users = [
  {
    _id: generateObjectId(),
    name: "John Smith",
    email: "john.smith@cdmo.com",
    role: "Operator",
  },
  {
    _id: generateObjectId(),
    name: "Sarah Johnson",
    email: "sarah.johnson@cdmo.com",
    role: "Analyst",
  },
  {
    _id: generateObjectId(),
    name: "Michael Chen",
    email: "michael.chen@cdmo.com",
    role: "QA",
  },
  {
    _id: generateObjectId(),
    name: "Emily Davis",
    email: "emily.davis@cdmo.com",
    role: "Supervisor",
  },
  {
    _id: generateObjectId(),
    name: "Robert Wilson",
    email: "robert.wilson@cdmo.com",
    role: "Admin",
  },
  {
    _id: generateObjectId(),
    name: "Lisa Garcia",
    email: "lisa.garcia@cdmo.com",
    role: "Operator",
  },
  {
    _id: generateObjectId(),
    name: "David Martinez",
    email: "david.martinez@cdmo.com",
    role: "Analyst",
  },
  {
    _id: generateObjectId(),
    name: "Jennifer Brown",
    email: "jennifer.brown@cdmo.com",
    role: "QA",
  },
  {
    _id: generateObjectId(),
    name: "Christopher Lee",
    email: "christopher.lee@cdmo.com",
    role: "Supervisor",
  },
  {
    _id: generateObjectId(),
    name: "Amanda Taylor",
    email: "amanda.taylor@cdmo.com",
    role: "Operator",
  },
];

// Generate Customers
const customers = [
  {
    _id: generateObjectId(),
    name: "Pharma Global Inc.",
    country: "USA",
    contact_person: "Dr. James Wilson",
    email: "james.wilson@pharmaglobal.com",
    phone: "+1-555-0123",
  },
  {
    _id: generateObjectId(),
    name: "European Medicines Ltd.",
    country: "Germany",
    contact_person: "Dr. Anna Mueller",
    email: "anna.mueller@euromed.de",
    phone: "+49-30-12345678",
  },
  {
    _id: generateObjectId(),
    name: "Asia Pacific Pharma",
    country: "Japan",
    contact_person: "Dr. Hiroshi Tanaka",
    email: "hiroshi.tanaka@appharma.jp",
    phone: "+81-3-12345678",
  },
  {
    _id: generateObjectId(),
    name: "Indian Pharmaceutical Co.",
    country: "India",
    contact_person: "Dr. Rajesh Sharma",
    email: "rajesh.sharma@indpharma.in",
    phone: "+91-11-12345678",
  },
  {
    _id: generateObjectId(),
    name: "Canadian Health Solutions",
    country: "Canada",
    contact_person: "Dr. Marie Dubois",
    email: "marie.dubois@canhealth.ca",
    phone: "+1-416-555-0234",
  },
];

// Generate Projects
const projects = [];
customers.forEach((customer, index) => {
  for (let i = 0; i < 3; i++) {
    projects.push({
      _id: generateObjectId(),
      project_code: `PRJ-${customer.name
        .substring(0, 3)
        .toUpperCase()}-${String(index + 1).padStart(2, "0")}-${String(
        i + 1
      ).padStart(2, "0")}`,
      project_name: `${customer.name} Development Project ${i + 1}`,
      customer: customer._id,
      status: Math.random() > 0.1 ? "Ongoing" : "Completed",
      start_date: randomDate(new Date("2019-01-01"), new Date("2023-12-31")),
      end_date:
        Math.random() > 0.7
          ? randomDate(new Date("2024-01-01"), new Date())
          : null,
      batches: [],
    });
  }
});

// Generate CAPAs
const capas = [];
for (let i = 1; i <= 15; i++) {
  const openedAt = randomDate();
  capas.push({
    _id: generateObjectId(),
    title: `CAPA-${String(i).padStart(
      3,
      "0"
    )} - Equipment Calibration Improvement`,
    description: `Corrective action for equipment calibration procedures and preventive measures for future compliance`,
    status:
      Math.random() > 0.3
        ? "Closed"
        : Math.random() > 0.5
        ? "In-Progress"
        : "Open",
    opened_at: openedAt,
    closed_at:
      Math.random() > 0.4
        ? addDays(openedAt, Math.floor(Math.random() * 90) + 30)
        : null,
    owner: users[Math.floor(Math.random() * users.length)]._id,
  });
}

// Generate comprehensive equipment list
const allEquipmentIds = [
  "WB-01",
  "R-101",
  "CJ-01",
  "CF-01",
  "FBD-02",
  "MIL-03",
  "QC-Lab",
  "GLR-201",
  "SEP-02",
  "H2-Reactor",
  "GLR-202",
  "CHR-Skid",
  "CJ-04",
  "CF-02",
  "Oven-01",
  "MIL-05",
  "GLR-301",
  "GLR-302",
  "GLR-303",
  "CJ-07",
  "CF-07",
  "GLR-304",
  "CJ-08",
  "VTD-02",
  "JET-01",
  "R-401",
  "R-402",
  "CJ-10",
  "CF-10",
  "Oven-03",
  "BL-01",
  "GLR-501",
  "CJ-12",
  "CF-12",
  "H2-Skid-2",
  "GLR-502",
  "CJ-13",
  "VTD-03",
  "MIL-09",
  "GLR-601",
  "GLR-602",
  "GLR-603",
  "GLR-604",
  "SEP-10",
  "CJ-15",
  "CF-15-ISO",
  "VTD-HP-01",
  "JET-HP-01",
  "H2-Skid-5",
  "SEP-12",
  "GLR-701",
  "CJ-17",
  "CF-17",
  "GLR-702",
  "CJ-18",
  "VTD-04",
  "MIL-11",
  "GLR-801",
  "GLR-802",
  "GLR-803",
  "SEP-15",
  "CJ-20",
  "CF-20-DR",
  "VTD-05-N2",
  "JET-03",
  "QC-Lab-B",
];

const equipment = [];
allEquipmentIds.forEach((id) => {
  equipment.push({
    _id: id,
    name: `Equipment ${id}`,
    model: `Model-${id}`,
    location: `Location-${id}`,
    calibration_status: Math.random() > 0.1 ? "Valid" : "Due Soon",
    last_calibrated_on: randomDate(new Date("2024-01-01"), new Date()),
    last_cleaned_on: randomDate(new Date("2024-06-01"), new Date()),
    status: "Available",
  });
});

// Generate 60+ Batches with proper distribution across APIs
const batches = [];
const batchComponents = [];
const processSteps = [];
const samples = [];
const testResults = [];
const deviations = [];
const equipmentEvents = [];

let batchCounter = 1;

// Generate batches for each API molecule
apiMolecules.forEach((apiMol) => {
  const batchesPerAPI = Math.floor(Math.random() * 5) + 8; // 8-12 batches per API

  for (let i = 0; i < batchesPerAPI; i++) {
    const batchId = generateObjectId();
    const apiBatchId = `${apiMol.code}-B${String(batchCounter).padStart(
      4,
      "0"
    )}`;
    const project = projects[Math.floor(Math.random() * projects.length)];
    const startDate = randomDate();

    // Create batch
    const batch = {
      _id: batchId,
      api_batch_id: apiBatchId,
      status:
        Math.random() > 0.15
          ? "Released"
          : Math.random() > 0.5
          ? "In-Process"
          : "On-Hold",
      customer: project.customer,
      project: project._id,
      components: [],
      process_steps: [],
      samples: [],
      deviations: [],
      equipment_events: [],
      released_at:
        Math.random() > 0.2
          ? addDays(startDate, Math.floor(Math.random() * 30) + 10)
          : null,
      released_by: users[Math.floor(Math.random() * users.length)]._id,
      createdAt: startDate,
      updatedAt: addDays(startDate, 5),
    };

    batches.push(batch);
    project.batches.push(batchId);

    // Generate BatchComponents (30+ per batch)
    const componentCount = Math.floor(Math.random() * 15) + 30;
    for (let j = 0; j < componentCount; j++) {
      const componentId = generateObjectId();
      const componentTypes = ["Raw Material", "Intermediate", "Excipient"];
      const componentType =
        Math.random() > 0.7
          ? "API"
          : componentTypes[Math.floor(Math.random() * componentTypes.length)];

      const batchComponent = {
        _id: componentId,
        batch: batchId,
        api_batch_id: apiBatchId,
        component_batch_id: `${apiBatchId}-C${String(j + 1).padStart(3, "0")}`,
        component_type: componentType,
        component_name: `${componentType} Component ${j + 1}`,
        material_code_component: `MAT-${String(j + 1).padStart(4, "0")}`,
        supplier_name: `Supplier ${Math.floor(Math.random() * 10) + 1}`,
        supplier_lot_id: `SL-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
        internal_lot_id: `IL-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        quantity_used: Math.floor(Math.random() * 1000) + 50,
        uom: ["kg", "L", "g", "mL"][Math.floor(Math.random() * 4)],
        usage_ts: addDays(startDate, Math.floor(Math.random() * 5)),
        coa: {
          received: Math.random() > 0.1,
          approval_date: addDays(startDate, Math.floor(Math.random() * 3)),
          reviewed_by: users[Math.floor(Math.random() * users.length)]._id,
        },
        qc: {
          status:
            Math.random() > 0.05
              ? "Approved"
              : Math.random() > 0.5
              ? "Pending"
              : "Rejected",
          approval_date: addDays(startDate, Math.floor(Math.random() * 4) + 1),
        },
        createdAt: startDate,
        updatedAt: addDays(startDate, 2),
      };

      batchComponents.push(batchComponent);
      batch.components.push(componentId);
    }

    // Generate ProcessSteps based on API molecule
    const equipmentList = equipmentMapping[apiMol.code] || ["WB-01", "R-101"];
    for (let stepIndex = 0; stepIndex < apiMol.steps; stepIndex++) {
      const processStepId = generateObjectId();
      const stepStartTime = addDays(startDate, stepIndex * 0.5);
      const stepEndTime = addDays(stepStartTime, Math.random() * 0.8 + 0.2);

      const processStep = {
        _id: processStepId,
        batch: batchId,
        api_batch_id: apiBatchId,
        step_name: apiMol.processSteps[stepIndex] || `Step ${stepIndex + 1}`,
        step_sequence: stepIndex + 1,
        start_timestamp: stepStartTime,
        end_timestamp: stepEndTime,
        equipment: [
          {
            equipment: equipmentList[stepIndex % equipmentList.length],
            equipment_status: Math.random() > 0.1 ? "Clean" : "In Use",
            calibration_status: Math.random() > 0.05 ? "Valid" : "Expired",
            last_cleaned_on: randomDate(new Date("2024-06-01"), stepStartTime),
            last_calibrated_on: randomDate(
              new Date("2024-01-01"),
              stepStartTime
            ),
            qa_approval_status: Math.random() > 0.08 ? "Approved" : "Hold",
            qa_reviewed_by: users[Math.floor(Math.random() * users.length)]._id,
          },
        ],
        qa_approval_status:
          Math.random() > 0.05
            ? "Approved"
            : Math.random() > 0.5
            ? "Hold"
            : "Rejected",
        qa_reviewed_by: users[Math.floor(Math.random() * users.length)]._id,
        createdAt: stepStartTime,
        updatedAt: stepEndTime,
      };

      processSteps.push(processStep);
      batch.process_steps.push(processStepId);

      // Generate EquipmentEvents
      const eventId = generateObjectId();
      const equipmentEvent = {
        _id: eventId,
        equipment: equipmentList[stepIndex % equipmentList.length],
        event_type: "Usage",
        timestamp: stepStartTime,
        related_batch: batchId,
        related_process_step: processStepId,
        notes: `Equipment used for ${
          apiMol.processSteps[stepIndex] || `Step ${stepIndex + 1}`
        }`,
        createdAt: stepStartTime,
        updatedAt: stepStartTime,
      };

      equipmentEvents.push(equipmentEvent);
      batch.equipment_events.push(eventId);
    }

    // Generate Samples (multiple per batch)
    const sampleCount = Math.floor(Math.random() * 8) + 5; // 5-12 samples per batch
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
      const sampleId = generateObjectId();
      const sampleCollectionDate = addDays(startDate, Math.random() * 10 + 2);

      const sample = {
        _id: sampleId,
        batch: batchId,
        api_batch_id: apiBatchId,
        sample_id: `${apiBatchId}-S${String(sampleIndex + 1).padStart(3, "0")}`,
        sample_type: ["In-Process", "Finished Product", "Stability"][
          Math.floor(Math.random() * 3)
        ],
        collected_at: sampleCollectionDate,
        collected_by: users[Math.floor(Math.random() * users.length)]._id,
        storage_location: `Storage-${Math.floor(Math.random() * 20) + 1}`,
        remarks:
          Math.random() > 0.7
            ? `Sample collected during step ${
                Math.floor(Math.random() * apiMol.steps) + 1
              }`
            : "",
        test_results: [],
        createdAt: sampleCollectionDate,
        updatedAt: addDays(sampleCollectionDate, 1),
      };

      samples.push(sample);
      batch.samples.push(sampleId);

      // Generate TestResults for each sample (multiple tests per sample)
      const testCount = Math.floor(Math.random() * 6) + 3; // 3-8 tests per sample
      const testParameters = [
        "Assay",
        "Related Substances",
        "Water Content",
        "Particle Size",
        "pH",
        "Residual Solvents",
        "Melting Point",
        "Optical Rotation",
      ];

      for (let testIndex = 0; testIndex < testCount; testIndex++) {
        const testResultId = generateObjectId();
        const parameter = testParameters[testIndex % testParameters.length];
        const testDate = addDays(sampleCollectionDate, Math.random() * 3 + 0.5);

        const testResult = {
          _id: testResultId,
          sample: sampleId,
          sample_id: sample.sample_id,
          test_id: `${sample.sample_id}-T${String(testIndex + 1).padStart(
            2,
            "0"
          )}`,
          method_id: `METHOD-${parameter.replace(" ", "").toUpperCase()}-001`,
          parameter: parameter,
          value: Math.random() * 100 + (parameter === "pH" ? 6 : 0),
          unit:
            parameter === "pH"
              ? "pH units"
              : parameter.includes("Size")
              ? "μm"
              : parameter.includes("Water")
              ? "%"
              : "%",
          result: Math.random() > 0.05 ? "Pass" : "Fail",
          tested_at: testDate,
          tested_by: users[Math.floor(Math.random() * users.length)]._id,
          equipment_used: [
            allEquipmentIds[Math.floor(Math.random() * allEquipmentIds.length)],
          ],
          reagents: [
            {
              reagent_id: `R-${String(
                Math.floor(Math.random() * 100) + 1
              ).padStart(3, "0")}`,
              name: `Reagent for ${parameter}`,
              lot_no: `RL-${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`,
              expiry: addDays(testDate, Math.floor(Math.random() * 365) + 30),
            },
          ],
          remarks: Math.random() > 0.8 ? "Repeat analysis required" : "",
          createdAt: testDate,
          updatedAt: addDays(testDate, 0.5),
        };

        testResults.push(testResult);
        sample.test_results.push(testResultId);
      }
    }

    // Generate Deviations (some batches will have deviations)
    if (Math.random() > 0.7) {
      // 30% chance of deviation
      const deviationCount = Math.floor(Math.random() * 3) + 1; // 1-3 deviations per affected batch

      for (let devIndex = 0; devIndex < deviationCount; devIndex++) {
        const deviationId = generateObjectId();
        const deviationDate = addDays(startDate, Math.random() * 8 + 1);

        const deviation = {
          _id: deviationId,
          deviation_no: `DEV-${String(batchCounter * 10 + devIndex).padStart(
            6,
            "0"
          )}`,
          batch: batchId,
          api_batch_id: apiBatchId,
          title: `Equipment Parameter Deviation - ${apiMol.name}`,
          description: `Temperature excursion observed during process step ${
            Math.floor(Math.random() * apiMol.steps) + 1
          }`,
          severity: ["Minor", "Major", "Critical"][
            Math.floor(Math.random() * 3)
          ],
          status:
            Math.random() > 0.3
              ? "Closed"
              : Math.random() > 0.5
              ? "In-Progress"
              : "Open",
          raised_by: users[Math.floor(Math.random() * users.length)]._id,
          raised_at: deviationDate,
          linked_entity: {
            entity_type: "Batch",
            batch: batchId,
          },
          resolution:
            Math.random() > 0.4
              ? {
                  action_taken:
                    "Process parameters adjusted and batch continued under deviation",
                  closed_by:
                    users[Math.floor(Math.random() * users.length)]._id,
                  closed_at: addDays(
                    deviationDate,
                    Math.floor(Math.random() * 15) + 5
                  ),
                  linked_capa:
                    Math.random() > 0.6
                      ? capas[Math.floor(Math.random() * capas.length)]._id
                      : null,
                }
              : null,
          createdAt: deviationDate,
          updatedAt: addDays(deviationDate, 3),
        };

        deviations.push(deviation);
        batch.deviations.push(deviationId);
      }
    }

    batchCounter++;
  }
});

// Generate additional EquipmentEvents for calibration, maintenance, etc.
for (let i = 0; i < 50; i++) {
  equipmentEvents.push({
    _id: generateObjectId(),
    equipment:
      allEquipmentIds[Math.floor(Math.random() * allEquipmentIds.length)],
    event_type: ["Calibration", "Cleaning", "Maintenance", "Fault"][
      Math.floor(Math.random() * 4)
    ],
    timestamp: randomDate(),
    related_batch: null,
    related_process_step: null,
    notes: "Scheduled maintenance activity",
    createdAt: randomDate(),
    updatedAt: randomDate(),
  });
}

// Export all data as JSON files
const allData = {
  users,
  customers,
  projects,
  capas,
  equipment,
  batches,
  batchComponents,
  processSteps,
  samples,
  testResults,
  deviations,
  equipmentEvents,
};

// Function to save JSON file
function saveToFile(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(filename, jsonStr, "utf8");
  console.log(`✅ ${filename} saved successfully`);
}

// Create output directory if it doesn't exist
const outputDir = "./output";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Save all individual collections
console.log("\n🚀 Generating CDMO Bulk Data...\n");

saveToFile(users, `${outputDir}/users.json`);
saveToFile(customers, `${outputDir}/customers.json`);
saveToFile(projects, `${outputDir}/projects.json`);
saveToFile(capas, `${outputDir}/capas.json`);
saveToFile(equipment, `${outputDir}/equipment.json`);
saveToFile(batches, `${outputDir}/batches.json`);
saveToFile(batchComponents, `${outputDir}/batch-components.json`);
saveToFile(processSteps, `${outputDir}/process-steps.json`);
saveToFile(samples, `${outputDir}/samples.json`);
saveToFile(testResults, `${outputDir}/test-results.json`);
saveToFile(deviations, `${outputDir}/deviations.json`);
saveToFile(equipmentEvents, `${outputDir}/equipment-events.json`);

// Save complete dataset
saveToFile(allData, `${outputDir}/cdmo-complete-dataset.json`);

console.log("\n📊 Generated Data Summary:");
console.log("========================");
console.log(`Users: ${users.length}`);
console.log(`Customers: ${customers.length}`);
console.log(`Projects: ${projects.length}`);
console.log(`CAPAs: ${capas.length}`);
console.log(`Equipment: ${equipment.length}`);
console.log(`Batches: ${batches.length}`);
console.log(`BatchComponents: ${batchComponents.length}`);
console.log(`ProcessSteps: ${processSteps.length}`);
console.log(`Samples: ${samples.length}`);
console.log(`TestResults: ${testResults.length}`);
console.log(`Deviations: ${deviations.length}`);
console.log(`EquipmentEvents: ${equipmentEvents.length}`);

console.log("\n✨ Data Characteristics:");
console.log("========================");
console.log("✅ All ObjectIds are valid 24-character hex strings");
console.log(
  "✅ Proper referential integrity maintained across all collections"
);
console.log("✅ Timestamps span from 2019 to present date");
console.log(`✅ ${batches.length} API batches across 8 different molecules`);
console.log(
  `✅ ${batchComponents.length} batch components with realistic supplier data`
);
console.log(
  "✅ Multiple process steps per batch following actual pharmaceutical processes"
);
console.log("✅ Comprehensive sampling and testing data");
console.log("✅ Realistic deviation scenarios with proper severity levels");
console.log("✅ Equipment events tracking usage, maintenance, and calibration");
console.log("✅ CAPA tracking with proper closure workflows");
console.log("✅ Multi-customer, multi-project structure");

console.log("\n🧬 API Molecules Covered:");
console.log("========================");
apiMolecules.forEach((api) => {
  console.log(`• ${api.name} - ${api.steps} process steps`);
});

console.log("\n🎯 All files saved to ./output/ directory");
console.log("📁 Ready for import into MongoDB!");

// ====================

// ====================
// 4. README.md
// ====================
/*
# CDMO Bulk Data Generator

## 🎯 Overview
Complete bulk data generator for CDMO pharmaceutical manufacturing with proper MongoDB ObjectId relations.

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Generate Data:**
   ```bash
   npm run generate
   ```

3. **Check Output:**
   All JSON files will be created in `./output/` directory

## 📊 Generated Data

- **Users:** 10 (Operators, Analysts, QA, Supervisors, Admins)
- **Customers:** 5 global pharmaceutical companies
- **Projects:** 15 active/completed projects  
- **Equipment:** 60+ pieces covering all process requirements
- **Batches:** 60+ across all API molecules
- **BatchComponents:** 1800+ with full supplier traceability
- **ProcessSteps:** 600+ following actual manufacturing sequences
- **Samples:** 400+ with comprehensive testing
- **TestResults:** 2000+ covering all quality parameters
- **Deviations:** 50+ with proper resolution workflows
- **CAPAs:** 15 for continuous improvement tracking

## 🧬 API Molecules Covered

1. Paracetamol (Acetaminophen) - 9 process steps
2. Ibuprofen (S-enantiomer) - 10 process steps  
3. Atorvastatin Calcium - 10 process steps
4. Metformin HCl - 9 process steps
5. Amlodipine Besylate - 10 process steps
6. Sofosbuvir (HPAPI) - 10 process steps
7. Sitagliptin Phosphate - 9 process steps
8. Olanzapine - 9 process steps

## ✅ Data Quality

- All ObjectIds are valid 24-character hex strings
- Proper referential integrity maintained across all collections
- Timestamps span from 2019 to present date
- Realistic pharmaceutical manufacturing workflows
- Comprehensive quality control and deviation management

## 📁 Output Files

Individual collections:
- `users.json`
- `customers.json` 
- `projects.json`
- `capas.json`
- `equipment.json`
- `batches.json`
- `batch-components.json`
- `process-steps.json`
- `samples.json`
- `test-results.json`
- `deviations.json`
- `equipment-events.json`

Complete dataset:
- `cdmo-complete-dataset.json`

## 🔧 Requirements

- Node.js 18+
- MongoDB (for ObjectId generation)
*/
