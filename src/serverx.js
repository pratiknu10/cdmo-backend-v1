import express from "express";
const app = express();
import { port } from "./config/env.js";
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
import UserModel from "./models/userModel.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import fs from "fs";
import cors from "cors";
dotenv.config({ path: "./src/.env" });
import { connectDB } from "./db/db.js";
import customerBatchRoutes from "./routes/customerBatchRoutes.js";
import batchRouter from "./routes/batchRoutes.js";
import genealogyRouter from "./routes/genealogyRoutes.js";
import sampleTestRoute from "./routes/sampleTestRoutes.js";
import DeviationCapaRouter from "./routes/deviationCapaRoutes.js";
import { equipmentRouter } from "./routes/equipmentRoutes.js";
import adminRouter from "./routes/adminRoute.js";
import CookieParser from "cookie-parser";
import authRouter from "./routes/authRotue.js";
// app.use("/api/projects", projectRoutes);

async function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}
connectDB("cdmo4");
async function seedData() {
  connectDB("cdmo3");

  console.log("Connected to MongoDB");

  // Load JSON seeds
  const inserts = [
    [CustomerModel, "./src/output2/customers.json"],
    [UserModel, "./src/output2/users.json"],
    [ProjectModel, "./src/output2/projects.json"],
    [EquipmentModel, "./src/output2/equipment.json"],
    [BatchModel, "./src/output2/batches.json"],
    [BatchComponentModel, "./src/output2/batchComponents.json"],
    [DeviationModel, "./src/output2/deviations.json"],
    [CapaModel, "./src/output2/capas.json"],
    [SampleModel, "./src/output2/samples.json"],
    [TestResultModel, "./src/output2/testResults.json"],
    [ProcessStepModel, "./src/output2/processSteps.json"],
    [EquipmentEventModel, "./src/output2/equipmentEvents.json"],
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

// ______  CSP HEADERS   _______
const setSecureHeaders = (req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  next();
};
app.use(setSecureHeaders);
const allowedOrigins = [
  "https://preview--cdmo.lovable.app",
  "http://20.55.30.42",
  "http://localhost:5173", // for local dev
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from allowedOrigins or server-to-server (no origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // <-- allow cookies/auth headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(auditMiddleware);
app.use(express.json());
app.use(CookieParser()); // Use cookie-parser middleware
app.get("/", (req, res) => {
  res.send("hello");
});

app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1", customerBatchRoutes);
app.use("/api/v1", authRouter);
app.use("/api/v1", batchRouter);
app.use("/api/v1", genealogyRouter);
app.use("/api/v1", sampleTestRoute);
app.use("/api/v1", DeviationCapaRouter);
app.use("/api/v1/equipments", equipmentRouter);
app.use("/api/v1/admin", adminRouter);
app.use(errorHandler);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
