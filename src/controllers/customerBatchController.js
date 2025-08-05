import mongoose from "mongoose";
import { BatchModel } from "../models/batchModel.js";
import { CustomerModel } from "../models/customerModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { TestResultModel } from "../models/testResultModel.js";

export const getBatchSummaryByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params; // Assuming customerId is passed as a URL parameter
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Validate customer exists with default values
    const customer = await CustomerModel.findById(customerId).lean();
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Ensure customer has all required fields with defaults
    const customerWithDefaults = {
      _id: customer._id,
      name: customer.name || "Unknown Customer",
      country: customer.country || "N/A",
      contact_person: customer.contact_person || "N/A",
      email: customer.email || "N/A",
      phone: customer.phone || "N/A",
    };

    // Build search filter
    const searchFilter = search
      ? {
          $or: [{ api_batch_id: { $regex: search, $options: "i" } }],
        }
      : {};

    // Optimized aggregation pipeline
    const pipeline = [
      {
        $match: {
          customer: new mongoose.Types.ObjectId(customerId),
          ...searchFilter,
        },
      },

      // Lookup project with defaults
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
          pipeline: [
            {
              $project: {
                project_name: { $ifNull: ["$project_name", "Unknown Product"] },
                project_code: { $ifNull: ["$project_code", "N/A"] },
              },
            },
          ],
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },

      // Optimized Lookup for samples count
      {
        $lookup: {
          from: "samples",
          localField: "_id",
          foreignField: "batch",
          as: "samplesData",
          pipeline: [{ $count: "count" }],
        },
      },
      {
        $addFields: {
          samplesCount: {
            $ifNull: [{ $arrayElemAt: ["$samplesData.count", 0] }, 0],
          },
        },
      },

      // Optimized Lookup for deviations and count critical/non-critical
      {
        $lookup: {
          from: "deviations",
          localField: "_id",
          foreignField: "batch",
          as: "deviationsAggregatedData",
          pipeline: [
            {
              $group: {
                _id: null, // Group all deviations for the batch into a single document
                total: { $sum: 1 },
                critical: {
                  $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] },
                },
                non_critical: {
                  $sum: { $cond: [{ $ne: ["$severity", "Critical"] }, 1, 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                total: 1,
                critical: 1,
                non_critical: 1,
              },
            },
            { $limit: 1 }, // Ensure only one aggregated document is returned per batch
          ],
        },
      },
      {
        $addFields: {
          // Extract counts from the single object in deviationsAggregatedData array
          // These are intermediate fields to be used in the final $project
          totalDeviationsCount: {
            $ifNull: [
              { $arrayElemAt: ["$deviationsAggregatedData.total", 0] },
              0,
            ],
          },
          criticalDeviationsCount: {
            $ifNull: [
              { $arrayElemAt: ["$deviationsAggregatedData.critical", 0] },
              0,
            ],
          },
          nonCriticalDeviationsCount: {
            $ifNull: [
              { $arrayElemAt: ["$deviationsAggregatedData.non_critical", 0] },
              0,
            ],
          },
        },
      },

      // Optimized Lookup for process steps and progress calculation
      {
        $lookup: {
          from: "processsteps",
          localField: "_id",
          foreignField: "batch",
          as: "processStepsData",
          pipeline: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: ["$end_timestamp", 1, 0] } },
              },
            },
            {
              $project: {
                _id: 0,
                total: 1,
                completed: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          totalProcessSteps: {
            $ifNull: [{ $arrayElemAt: ["$processStepsData.total", 0] }, 0],
          },
          completedProcessSteps: {
            $ifNull: [{ $arrayElemAt: ["$processStepsData.completed", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          progress: {
            $cond: [
              { $gt: ["$totalProcessSteps", 0] },
              {
                $multiply: [
                  { $divide: ["$completedProcessSteps", "$totalProcessSteps"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },

      // Add computed fields for UI display
      {
        $addFields: {
          displayStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$status", "In-Process"] },
                  then: "In Progress",
                },
                { case: { $eq: ["$status", "On-Hold"] }, then: "QA Hold" },
                { case: { $eq: ["$status", "Released"] }, then: "Released" },
                { case: { $eq: ["$status", "Rejected"] }, then: "Not Started" },
              ],
              default: { $ifNull: ["$status", "Unknown"] },
            },
          },
          statusColor: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "In-Process"] }, then: "yellow" },
                { case: { $eq: ["$status", "On-Hold"] }, then: "gray" },
                { case: { $eq: ["$status", "Released"] }, then: "green" },
                { case: { $eq: ["$status", "Rejected"] }, then: "blue" },
              ],
              default: "orange",
            },
          },
          // Placeholder for Target Release - assuming it's a field in BatchModel or derived
          target_release: { $ifNull: ["$released_at", "N/A"] },
        },
      },
    ];

    // Get summary counts
    const summaryPipeline = [
      ...pipeline,
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          notStarted: {
            $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In-Process"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          qaHold: {
            $sum: { $cond: [{ $eq: ["$status", "On-Hold"] }, 1, 0] },
          },
          released: {
            $sum: { $cond: [{ $eq: ["$status", "Released"] }, 1, 0] },
          },
        },
      },
    ];

    // Execute summary aggregation
    const [summaryResult] = await BatchModel.aggregate(summaryPipeline);
    const summary = summaryResult || {
      totalBatches: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      qaHold: 0,
      released: 0,
    };

    // Execute main pipeline with pagination and sorting
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const batchData = await BatchModel.aggregate([
      ...pipeline,
      { $sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          api_batch_id: 1,
          displayStatus: 1,
          statusColor: 1,
          // Project the calculated counts for deviations and samples
          deviations: {
            // Directly use the aggregated object from the lookup result
            $ifNull: [
              { $arrayElemAt: ["$deviationsAggregatedData", 0] },
              { total: 0, critical: 0, non_critical: 0 }, // Default if no deviations found
            ],
          },
          samples: "$samplesCount",
          progress: { $round: ["$progress", 0] }, // Round progress to whole number
          createdAt: 1,
          released_at: 1,
          project: {
            project_name: 1,
            project_code: 1,
          },
          customer: "$project.customer.name", // Assuming customer name is populated under project
          // Removed explicit exclusions to avoid the "Cannot do exclusion on field... in inclusion projection" error
        },
      },
    ]);

    const totalPages = Math.ceil(summary.totalBatches / parseInt(limit));

    // Audit log
    console.log(
      `📋 Customer batch summary accessed - Customer: ${customerId}, Page: ${page}, User: ${
        req.headers["user-id"] || "anonymous"
      }`
    );

    res.json({
      success: true,
      data: {
        customer: {
          ...customerWithDefaults,
          totalBatches: summary.totalBatches,
        },
        summary,
        batches: batchData,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: summary.totalBatches,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching customer batch summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getBatchIdDetailByID = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Comprehensive batch details aggregation
    const batchDetails = await BatchModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(batchId) } },

      // Lookup customer
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      // Lookup project
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },

      // Lookup process steps
      {
        $lookup: {
          from: "processsteps",
          localField: "_id",
          foreignField: "batch",
          as: "processSteps",
          pipeline: [
            { $sort: { step_sequence: 1 } },
            {
              $project: {
                step_name: 1,
                step_sequence: 1,
                start_timestamp: 1,
                end_timestamp: 1,
                qa_approval_status: 1,
                equipment: 1,
              },
            },
          ],
        },
      },

      // Lookup batch components
      {
        $lookup: {
          from: "batchcomponents",
          localField: "_id",
          foreignField: "batch",
          as: "components",
          pipeline: [
            {
              $project: {
                component_name: 1,
                component_type: 1,
                quantity_used: 1,
                uom: 1,
                supplier_name: 1,
                qc: 1,
              },
            },
          ],
        },
      },

      // Lookup samples and test results
      {
        $lookup: {
          from: "samples",
          localField: "_id",
          foreignField: "batch",
          as: "samples",
          pipeline: [
            {
              $lookup: {
                from: "testresults",
                localField: "_id",
                foreignField: "sample",
                as: "testResults",
              },
            },
            {
              $project: {
                sample_id: 1,
                sample_type: 1,
                collected_at: 1,
                storage_location: 1,
                testResults: {
                  parameter: 1,
                  result: 1,
                  value: 1,
                  unit: 1,
                  tested_at: 1,
                },
              },
            },
          ],
        },
      },

      // Lookup deviations
      {
        $lookup: {
          from: "deviations",
          localField: "_id",
          foreignField: "batch",
          as: "deviations",
          pipeline: [
            {
              $project: {
                deviation_no: 1,
                title: 1,
                severity: 1,
                status: 1,
                raised_at: 1,
                description: 1,
              },
            },
          ],
        },
      },

      // Lookup equipment events
      {
        $lookup: {
          from: "equipmentevents",
          localField: "_id",
          foreignField: "related_batch",
          as: "equipmentEvents",
          pipeline: [
            {
              $project: {
                equipment: 1,
                event_type: 1,
                timestamp: 1,
                notes: 1,
              },
            },
          ],
        },
      },

      {
        $project: {
          api_batch_id: 1,
          status: 1,
          createdAt: 1,
          released_at: 1,
          released_by: 1,
          customer: {
            _id: 1,
            name: 1,
            country: 1,
          },
          project: {
            _id: 1,
            project_name: 1,
            project_code: 1,
          },
          processSteps: 1,
          components: 1,
          samples: 1,
          deviations: 1,
          equipmentEvents: 1,
          // Summary counts
          totalProcessSteps: { $size: "$processSteps" },
          totalComponents: { $size: "$components" },
          totalSamples: { $size: "$samples" },
          totalDeviations: { $size: "$deviations" },
          openDeviations: {
            $size: {
              $filter: {
                input: "$deviations",
                cond: { $in: ["$$this.status", ["Open", "In-Progress"]] },
              },
            },
          },
        },
      },
    ]);

    if (!batchDetails.length) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Audit log
    console.log(`User viewed batch details - Batch: ${batchId}`);

    res.json({
      success: true,
      data: batchDetails[0],
    });
  } catch (error) {
    console.error("Error fetching batch details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const batchReleaseActionByID = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { userId, releaseNotes = "" } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for batch release",
      });
    }

    // Check if batch exists and can be released
    const batch = await BatchModel.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Business logic: Check if batch can be released
    if (batch.status === "Released") {
      return res.status(400).json({
        success: false,
        message: "Batch is already released",
      });
    }

    // Check for open deviations
    const openDeviations = await DeviationModel.countDocuments({
      batch: batchId,
      status: { $in: ["Open", "In-Progress"] },
    });

    if (openDeviations > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot release batch. ${openDeviations} open deviation(s) must be resolved first.`,
      });
    }

    // Check for pending test results
    const samples = await SampleModel.find({ batch: batchId });
    const sampleIds = samples.map((s) => s._id);

    const pendingTests = await TestResultModel.countDocuments({
      sample: { $in: sampleIds },
      result: { $in: ["Pending", "In-Progress"] },
    });

    if (pendingTests > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot release batch. ${pendingTests} test result(s) are still pending.`,
      });
    }

    // Update batch status
    const updatedBatch = await BatchModel.findByIdAndUpdate(
      batchId,
      {
        $set: {
          status: "Released",
          released_at: new Date(),
          released_by: userId,
          releaseNotes: releaseNotes,
        },
      },
      { new: true }
    )
      .populate("customer", "name")
      .populate("project", "project_name");

    // Audit log
    console.log(
      `Batch released - Batch: ${batchId}, User: ${userId}, Timestamp: ${new Date()}`
    );

    res.json({
      success: true,
      message: "Batch released successfully",
      data: {
        batchId: updatedBatch._id,
        api_batch_id: updatedBatch.api_batch_id,
        status: updatedBatch.status,
        released_at: updatedBatch.released_at,
        customer: updatedBatch.customer.name,
        project: updatedBatch.project.project_name,
      },
    });
  } catch (error) {
    console.error("Error releasing batch:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const customerBatchQueryByID = async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      query = "",
      status = "",
      dateFrom = "",
      dateTo = "",
      hasDeviations = "",
      hasPendingSamples = "",
    } = req.query;

    // Build filter
    const filter = { customer: new mongoose.Types.ObjectId(customerId) };

    if (query) {
      filter.$or = [{ api_batch_id: { $regex: query, $options: "i" } }];
    }

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
    ];

    // Add deviation filter if specified
    if (hasDeviations === "true") {
      pipeline.push({
        $lookup: {
          from: "deviations",
          localField: "_id",
          foreignField: "batch",
          as: "deviations",
        },
      });
      pipeline.push({
        $match: { "deviations.0": { $exists: true } },
      });
    }

    // Add pending samples filter if specified
    if (hasPendingSamples === "true") {
      pipeline.push({
        $lookup: {
          from: "samples",
          localField: "_id",
          foreignField: "batch",
          as: "samples",
        },
      });
      pipeline.push({
        $lookup: {
          from: "testresults",
          let: { sampleIds: "$samples._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$sample", "$$sampleIds"] },
                    { $in: ["$result", ["Pending", "In-Progress"]] },
                  ],
                },
              },
            },
          ],
          as: "pendingTests",
        },
      });
      pipeline.push({
        $match: { "pendingTests.0": { $exists: true } },
      });
    }

    pipeline.push({
      $project: {
        api_batch_id: 1,
        status: 1,
        createdAt: 1,
        "project.project_name": 1,
      },
    });

    const results = await BatchModel.aggregate(pipeline);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error searching batches:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateBatchStatusByUserID = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { status, userId, notes = "" } = req.body;

    const validStatuses = ["In-Process", "Released", "Rejected", "On-Hold"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
      });
    }

    const batch = await BatchModel.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    if (status === "Released") {
      updateData.released_at = new Date();
      updateData.released_by = userId;
    }

    const updatedBatch = await BatchModel.findByIdAndUpdate(
      batchId,
      { $set: updateData },
      { new: true }
    );

    // Audit log
    console.log(
      `Batch status updated - Batch: ${batchId}, Status: ${status}, User: ${userId}, Timestamp: ${new Date()}`
    );

    res.json({
      success: true,
      message: "Batch status updated successfully",
      data: {
        batchId: updatedBatch._id,
        api_batch_id: updatedBatch.api_batch_id,
        status: updatedBatch.status,
        updatedAt: updatedBatch.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating batch status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const exportBatchByCustomerID = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { format = "json" } = req.query;

    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const exportData = await BatchModel.aggregate([
      { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $lookup: {
          from: "deviations",
          localField: "_id",
          foreignField: "batch",
          as: "deviations",
        },
      },
      {
        $lookup: {
          from: "samples",
          localField: "_id",
          foreignField: "batch",
          as: "samples",
        },
      },
      {
        $project: {
          "Batch ID": "$api_batch_id",
          Product: "$project.project_name",
          Status: "$status",
          "Created Date": "$createdAt",
          "Released Date": "$released_at",
          "Total Samples": { $size: "$samples" },
          "Total Deviations": { $size: "$deviations" },
          "Open Deviations": {
            $size: {
              $filter: {
                input: "$deviations",
                cond: { $in: ["$$this.status", ["Open", "In-Progress"]] },
              },
            },
          },
        },
      },
    ]);

    // Audit log
    console.log(
      `Customer batch data exported - Customer: ${customerId}, Format: ${format}`
    );

    res.json({
      success: true,
      data: {
        customer: customer.name,
        exportDate: new Date(),
        totalBatches: exportData.length,
        batches: exportData,
      },
    });
  } catch (error) {
    console.error("Error exporting batch data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
