import mongoose from "mongoose";
import { DB_URL } from "../config/env.js";
export async function connectDB(DB_NAME) {
  await mongoose.connect(DB_URL, { dbName: DB_NAME });
  console.log("db connected");
}
