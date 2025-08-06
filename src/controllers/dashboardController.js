// controllers/dashboardController.js
import { CustomerModel } from "../models/customerModel.js";
import { BatchModel } from "../models/batchModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { formatDistanceToNow } from "date-fns";

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
    const pipeline = [
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
          // batches: 1, // Keep if you need the full batch array in the output, otherwise remove for smaller response
          country: 1,
          contact_person: 1,
          email: 1,
          phone: 1,
          // Aggregating counts for each status
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
            // New field for 'Completed' status
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "Completed"] }, // Assuming 'Completed' is the status value
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
            // New field for 'On-Hold' status
            $size: {
              $filter: {
                input: "$batches",
                as: "b",
                cond: { $eq: ["$$b.status", "On-Hold"] },
              },
            },
          },
          // 'active_batches' combines 'In-Process' and 'On-Hold'
          active_batches: {
            $size: {
              $filter: {
                input: "$batches",
                as: "batch",
                cond: { $in: ["$$batch.status", ["In-Process", "On-Hold"]] },
              },
            },
          },
          // 'pending_release' is 'On-Hold' AND 'released_at' is null
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
      completed: r.completed, // Include the new 'completed' field
      released: r.released,
      on_hold: r.on_hold, // Include the new 'on_hold' field
      pending_release: r.pending_release,
      last_activity: r.last_updated
        ? formatDistanceToNow(new Date(r.last_updated), { addSuffix: true })
        : "No activity",
    }));

    console.log(formatted);
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load customer summary" });
  }
};
