// routes/auth.js
import express from "express";

import { userLogin, userLogout } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/user/login", userLogin);
authRouter.post("/user/logout", userLogout);

export default authRouter;
