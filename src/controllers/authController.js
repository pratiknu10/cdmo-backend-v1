import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const userLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Populate both the user's role and their project assignments to include in the response
    const user = await UserModel.findOne({ username })
      .populate({ path: "role", select: "name permissions" })
      .populate({
        path: "projectAssignments.projectId",
        select: "project_code project_name",
      });

    if (!user) {
      return res.status(400).send("Invalid username or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid username or password.");
    }
    // Update the lastLogin field on successful login
    user.lastLogin = new Date();
    await user.save();
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
      sameSite: "none", // Provides protection against CSRF attacks
      maxAge: 3600000, // 1 hour expiration
    });

    res.json({
      message: "Logged in successfully!",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions, // Return the user's permissions
        assignedProjects: user.projectAssignments, // Return the user's assigned projects
        lastLogin: user.lastLogin,
        status: user.status,
      },
    });
  } catch (error) {
    res.json({
      message: error.message,
    });
  }
};
export const userLogout = async (req, res) => {
  // Clearing the 'token' cookie effectively logs the user out.
  // The 'httpOnly: true' option means this cookie cannot be cleared by client-side JS.
  // By clearing it on the server, we ensure a secure logout.
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully.", data: null });
};
