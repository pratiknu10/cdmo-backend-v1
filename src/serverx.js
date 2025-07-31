import express from "express";
const app = express();
import { port } from "./config/env.js";
import projectRoutes from "./routes/projectRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import auditMiddleware from "./middleware/auditMiddleware.js";

import dotenv from "dotenv";
import { CustomerModel } from "./models/customerModel.js";
import { BatchModel } from "./models/batchModel.js";
import { BatchComponentModel } from "./models/batchComponentModel.js";
import { DeviationModel } from "./models/deviationModel.js";
import { CapaModel } from "./models/capaModel.js";
import { EquipmentModel } from "./models/equipmentModel.js";
import { EquipmentEventModel } from "./models/equipmentEventModel.js";
import { SampleModel } from "./models/sampleModel.js";
import { TestResultModel } from "./models/testResultModel.js";
import { ProjectModel } from "./models/projectModel.js";
import { ProcessStepModel } from "./models/processStepModel.js";
import { UserModel } from "./models/userModel.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
import { connectDB } from "./db/db.js";
import customerBatchRoutes from "./routes/customerBatchRoutes.js";
import batchRouter from "./routes/batchRoutes.js";
import genealogyRouter from "./routes/genealogyRoutes.js";
import sampleTestRoute from "./routes/sampleTestRoutes.js";
import DeviationCapaRouter from "./routes/deviationCapaRoutes.js";
app.use(express.json());
// app.use("/api/projects", projectRoutes);

app.use(errorHandler);

async function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}
connectDB("cdmo3");
async function seedData() {
  connectDB("cdmo3");

  console.log("Connected to MongoDB");

  // Load JSON seeds
  const inserts = [
    [CustomerModel, "./src/output/customers.json"],
    [UserModel, "./src/output/users.json"],
    [ProjectModel, "./src/output/projects.json"],
    [EquipmentModel, "./src/output/equipment.json"],
    [BatchModel, "./src/output/batches.json"],
    [BatchComponentModel, "./src/output/batchComponents.json"],
    [DeviationModel, "./src/output/deviations.json"],
    [CapaModel, "./src/output/capas.json"],
    [SampleModel, "./src/output/samples.json"],
    [TestResultModel, "./src/output/testResults.json"],
    [ProcessStepModel, "./src/output/processSteps.json"],
    [EquipmentEventModel, "./src/output/equipmentEvents.json"],
  ];
  for (const [Model, file] of inserts) {
    const data = await readJSON(file);
    console.log(data);
    await Model.insertMany(data);
    console.log(`✅ Inserted ${data.length} into ${Model.modelName}`);
  }

  console.log("🚀 All data inserted successfully.");
  process.exit(0);
}

// seedData().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
app.use(auditMiddleware);
app.get("/", (req, res) => {
  res.send("hello");
});
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1", customerBatchRoutes);
app.use("/api/v1", batchRouter);
// app.use("/api/v1", genealogyRouter);
// app.use("/api/v1", sampleTestRoute);
// app.use("/api/v1", DeviationCapaRouter);
app.use(errorHandler);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
