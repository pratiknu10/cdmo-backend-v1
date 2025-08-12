// routes/auth.js
import express from "express";

import { userLogin } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/user/login", userLogin);

export default authRouter;
