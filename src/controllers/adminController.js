import { CustomerModel } from "../models/customerModel.js";
import RoleModel from "../models/roleModel.js";
import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if an "Admin" role exists
    const adminRole = await RoleModel.findOne({ name: "Admin" });
    if (!adminRole) {
      return res
        .status(400)
        .send("Admin role not found. Please create the Admin role first.");
    }

    // Check if an admin user already exists
    const existingAdmin = await UserModel.findOne({ role: adminRole._id });
    if (existingAdmin) {
      return res.status(409).send("An admin user already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdminUser = new UserModel({
      username,
      email,
      password: hashedPassword,
      role: adminRole._id, // Assign the Admin role
    });

    await newAdminUser.save();
    res.status(201).send("Admin user registered successfully.");
  } catch (error) {
    console.error("Error registering admin user:", error);
    res.status(500).send("Server error.");
  }
};
export const getCustomerBatches = async (req, res) => {
  try {
    // Aggregate data from Customer, Project, and Batch collections
    const customers = await CustomerModel.aggregate([
      {
        $lookup: {
          from: "projects", // The name of the collection for ProjectModel
          localField: "_id",
          foreignField: "customer",
          as: "projects",
        },
      },
      {
        $unwind: "$projects",
      },
      {
        $lookup: {
          from: "batches", // The name of the collection for BatchModel
          localField: "projects.batches",
          foreignField: "_id",
          as: "batches",
        },
      },
      {
        $unwind: { path: "$batches", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: "$batches._id",
          customerName: "$name",
          customerId: "$_id",
          projectCode: "$projects.project_code",
          apiBatchId: "$batches.api_batch_id",
          batchStatus: "$batches.status",
        },
      },
      {
        $group: {
          _id: "$customerId",
          customerName: { $first: "$customerName" },
          customerId: { $first: "$customerId" },
          batches: {
            $push: {
              batchId: "$_id",
              projectCode: "$projectCode",
              apiBatchId: "$apiBatchId",
              batchStatus: "$batchStatus",
            },
          },
        },
      },
    ]);

    // Format the output to match the desired table structure
    const formattedData = customers.flatMap((customer) => {
      return customer.batches.map((batch) => ({
        _id: batch.batchId, // Include the batch _id
        sno: "", // This should be populated on the client-side
        customerName: customer.customerName,
        customerId: customer.customerId,
        projectCode: batch.projectCode,
        apiBatchId: batch.apiBatchId,
        batchStatus: batch.batchStatus,
      }));
    });

    res.json(formattedData);
  } catch (error) {
    console.error("Error fetching customers and batches:", error);
    res.status(500).send("Server error.");
  }
};
export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({ _id: { $ne: req.user.id } }).populate(
      "role",
      "name"
    ); // Only populate the 'name' field from the role

    // Transform the data to match the UI requirements
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.username,
      email: user.email,
      role: user.role.name,
      department: user.department,
      status: user.status,
      lastLogin: user.lastLogin,
    }));

    return res.json({
      data: formattedUsers,
      message: "user details fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: error.message, data: null });
  }
};
export const assignUser = async (req, res) => {
  try {
    const { userId, projectIds, assignedRole } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Ensure projectIds is always an array for consistent processing
    const idsToAssign = Array.isArray(projectIds) ? projectIds : [projectIds];

    // Iterate over each projectId and either update or add the assignment
    idsToAssign.forEach((projectId) => {
      const existingAssignment = user.projectAssignments.find(
        (assignment) => assignment.projectId.toString() === projectId
      );
      if (existingAssignment) {
        existingAssignment.assignedRole = assignedRole;
      } else {
        user.projectAssignments.push({ projectId, assignedRole });
      }
    });

    await user.save();
    res.status(200).send("User assigned to projects successfully.");
  } catch (error) {
    console.error("Error assigning user:", error);
    res.status(500).send("Server error.");
  }
};
export const users = async (req, res) => {
  try {
    const { username, email, password, roleId, department } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
      role: roleId,
      department,
    });
    await newUser.save();

    res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: error.message });
  }
};
export const getRoles = async (req, res) => {
  try {
    const roles = await RoleModel.find({});
    res.json({ data: roles, message: "roles fetched successfully" });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: error.message, data: null });
  }
};
export const updatePermissions = async (req, res) => {
  try {
    const userId = req.params.id;
    const { permissions } = req.body; // Array of new permissions

    const user = await UserModel.findById(userId).populate("role");
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const role = await RoleModel.findById(user.role._id);
    if (!role) {
      return res.status(404).send("User role not found.");
    }

    // Update the permissions on the role
    role.permissions = permissions;
    await role.save();

    res.status(200).send("Permissions updated successfully.");
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).send("Server error.");
  }
};
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const newRole = new RoleModel({ name, description, permissions });
    await newRole.save();
    res.status(201).json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).send("Server error.");
  }
};
