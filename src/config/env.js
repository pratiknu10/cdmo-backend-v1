import dotenv from "dotenv";
dotenv.config({ path: "./src/.env" });

export const port = process.env.PORT || 5002;
export const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/myapp";
export const jwtSecret = process.env.JWT_SECRET || "your_jwt-secret";
export const jwtExpiration = process.env.JWT_EXPIRATION || "1h";
export const apiUrl = process.env.API_URL || "http://localhost:5002/api";
export const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
console.log(process.env.MONGO_URI);
export const DB_URL = process.env.MONGO_URI || "mongodb://localhost:27017";
export const DB_NAME = process.env.DB_NAME || "cdmo2";
