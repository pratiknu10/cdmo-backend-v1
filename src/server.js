import express from "express";
const app = express();
import { port } from "./config/env.js";
import projectRoutes from "./routes/projectRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

import dotenv from "dotenv";
import { Equipment } from "./CDMO_MODEL/equipment.js";
import { Sample } from "./CDMO_MODEL/sample.js";
import { Batch } from "./CDMO_MODEL/batch.js";
import { ProcessStep } from "./CDMO_MODEL/processStep.js";
import { Material } from "./CDMO_MODEL/material.js";
import { Customer } from "./CDMO_MODEL/customer.js";
import { Project } from "./CDMO_MODEL/project.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import fs from "fs";
dotenv.config();
import { connectDB } from "./db/db.js";
app.use(express.json());
// app.use("/api/projects", projectRoutes);
app.use("/api/v1");
app.use(errorHandler);
async function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

async function main() {
  connectDB();

  console.log("Connected to MongoDB");

  // Load JSON seeds
  const equipments = await readJSON("./src/seeds/equipments.json");
  const samples = await readJSON("./src/seeds/samples.json");
  const batches = await readJSON("./src/seeds/batches.json");
  const steps = await readJSON("./src/seeds/process_steps.json");
  const customers = await readJSON("./src/seeds/customer.json");
  const materials = await readJSON("./src/seeds/material.json");
  const projects = await readJSON("./src/seeds/projects.json");

  const insertedEquipments = await Equipment.insertMany(equipments);
  const insertedMaterials = await Material.insertMany(materials);
  const insertedSamples = await Sample.insertMany(samples);
  const insertedBatches = await Batch.insertMany(batches);
  const insertedProjects = await Project.insertMany(projects);
  const insertedCustomers = await Customer.insertMany(customers);
  await ProcessStep.insertMany(steps);
  console.log("All seeds inserted successfully!");
  process.exit();
}

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
app.use("/dashboard", dashboardRoutes);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
