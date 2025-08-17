import UserModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
export const authenticateToken = (req, res, next) => {
  // Check for the token in the HTTP-only cookie first
  const token =
    req.cookies.token ||
    (req.headers["authorization"] &&
      req.headers["authorization"].split(" ")[1]);
  console.log(req.cookies);
  console.log(token);
  if (token == null) return res.sendStatus(401); // No token found in cookie or header

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      res.clearCookie("token"); // Clear invalid cookie
      return res.sendStatus(403); // Invalid token
    }
    console.log(user);
    req.user = user;
    next();
  });
};

// ABAC Middleware to check for Admin role
export const isAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id).populate("role");
    if (user && user.role.name === "Admin") {
      next();
    } else {
      res.status(403).send("Access Denied: Requires Admin role.");
    }
  } catch (error) {
    res.status(500).send("Server Error during authorization.");
  }
};
