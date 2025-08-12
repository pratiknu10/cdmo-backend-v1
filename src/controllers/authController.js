import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const userLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username }).populate("role");
    if (!user) {
      return res.status(400).send("Invalid username or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid username or password.");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role.name },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Set the JWT as an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
      secure: process.env.NODE_ENV === "production", // Ensures the cookie is sent only over HTTPS in production
      sameSite: "strict", // Provides protection against CSRF attacks
      maxAge: 3600000, // 1 hour expiration
    });

    res.json({
      message: "Logged in successfully!",
      user: { id: user._id, username: user.username, role: user.role.name },
    });
  } catch (error) {
    res.json({
      message: error.message,
    });
  }
};
