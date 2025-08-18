// controllers/dashboardController.js
import { CustomerModel } from "../models/customerModel.js";
import { BatchModel } from "../models/batchModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { formatDistanceToNow } from "date-fns";
import { ProjectModel } from "../models/projectModel.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const [
      activeCustomers,
      activeBatches,
      openDeviations,
      labSamples,
      releasedToday,
    ] = await Promise.all([
      CustomerModel.countDocuments({}),
      BatchModel.countDocuments({ status: { $in: ["In-Process", "On-Hold"] } }),
      DeviationModel.countDocuments({ status: "Open" }),
      SampleModel.countDocuments({}),
      BatchModel.countDocuments({
        status: "Released",
        // released_at: {
        //   $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        //   $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        // },
      }),
    ]);

    res.json({
      activeCustomers,
      activeBatches,
      openDeviations,
      labSamples,
      releasedToday,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard summary" });
  }
};

// controllers/dashboardController.js

export const getCustomerBatchSummary = async (req, res) => {
  try {
    // --- Access Control Logic Start ---
    let customerFilter = {};

    // Check if the user is not an admin
    if (req.user && req.user.role !== "admin") {
      // Find all projects assigned to the user
      const assignedProjects = await ProjectModel.find({
        _id: { $in: req.user.projectAssignments.map((p) => p.projectId) },
      }).select("customer");

      // Extract the unique customer IDs directly from the projects
      const accessibleCustomers = [
        ...new Set(assignedProjects.map((p) => p.customer)),
      ];

      // If no projects are assigned, there will be no customers to show.
      if (accessibleCustomers.length === 0) {
        return res.json([]);
      }

      // Set the filter for the main aggregation pipeline
      customerFilter = { _id: { $in: accessibleCustomers } };
    }
    // --- Access Control Logic End ---

    const pipeline = [
      // Add the $match stage here to filter customers first.
      // This is a crucial step for performance, as it reduces the number of documents processed.
      {
        $match: customerFilter,
      },
      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "customer",
          as: "batches",
        },
      },
      {
        $project: {
          name: 1,
          country: 1,
          contact_person: 1,
          email: 1,
          phone: 1,
          not_started: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "Not Started"] },
              },
            },
          },
          in_progress: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "In-Process"] },
              },
            },
          },
          completed: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "Completed"] },
              },
            },
          },
          released: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "Released"] },
              },
            },
          },
          on_hold: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "On-Hold"] },
              },
            },
          },
          active_batches: {
            $size: {
              $filter: {
                input: "$batches",
                as: "batch",
                cond: { $in: ["$$batch.status", ["In-Process", "On-Hold"]] },
              },
            },
          },
          pending_release: {
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: {
                  $and: [
                    { $eq: ["$$b.status", "On-Hold"] },
                    { $eq: ["$$b.released_at", null] },
                  ],
                },
              },
            },
          },
          last_updated: {
            $max: "$batches.updatedAt",
          },
        },
      },
      {
        $sort: { last_updated: -1 },
      },
    ];

    const results = await CustomerModel.aggregate(pipeline);

    const formatted = results.map((r) => ({
      customer_id: r._id,
      customer_name: r.name,
      contact_person: r.contact_person,
      email: r.email,
      phone: r.phone,
      country: r.country,
      active_batches: r.active_batches,
      not_started: r.not_started,
      in_progress: r.in_progress,
      completed: r.completed,
      released: r.released,
      on_hold: r.on_hold,
      pending_release: r.pending_release,
      last_activity: r.last_updated
        ? formatDistanceToNow(new Date(r.last_updated), { addSuffix: true })
        : "No activity",
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load customer summary" });
  }
};
