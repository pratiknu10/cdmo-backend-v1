import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/env.js";
export const verifyToken = (req, res, next) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        message: "No token provided, Authorization denied",
        status: 401,
      });
    }
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        message: "Token is not valid",
        status: 401,
      });
    }
  } else {
    return res.status(401).json({
      message: "Authorization header is missing or malformed",
      status: 401,
    });
  }
};
