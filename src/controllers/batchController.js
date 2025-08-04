import mongoose from "mongoose";
import { BatchModel } from "../models/batchModel.js";
import { CustomerModel } from "../models/customerModel.js";
import { ProjectModel } from "../models/projectModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { ProcessStepModel } from "../models/processStepModel.js";
import { TestResultModel } from "../models/testResultModel.js";
import { BatchComponentModel } from "../models/batchComponentModel.js";
import { EquipmentEventModel } from "../models/equipmentEventModel.js";
import { EquipmentModel } from "../models/equipmentModel.js";
import { CapaModel } from "../models/capaModel.js";
// ================================
// 1. MAIN BATCH DETAILED SUMMARY API
// Route: GET /api/batches/:batchId/detailed-summary
// Purpose: Get complete batch overview with all tabs data
// ================================

export const getBatchOverview = async (req, res) => {
  try {
    // Find all batches and populate the necessary fields from other collections.
    // The populate calls are optimized to only retrieve the data needed for the overview.
    const batches = await BatchModel.find({})
      .populate({
        path: "customer",
        select: "name", // Only fetch the customer's name
      })
      .populate({
        path: "project",
        select: "project_name", // Only fetch the project's name for the 'Product' column
      })
      .populate({
        path: "deviations",
        select: "severity", // Only fetch the deviation's severity for counting
      })
      .populate({
        path: "samples",
        select: "_id", // Only fetch the sample's ID for counting
      })
      .populate({
        path: "process_steps",
        select: "end_timestamp", // Only fetch end_timestamp to calculate progress
      });

    // Calculate status counts for the new stats object
    const totalBatchesCount = batches.length;
    let notStartedCount = 0;
    let inProgressCount = 0;
    let qaHoldCount = 0;
    let releasedCount = 0;
    let awaitingCoaCount = 0;

    batches.forEach((batch) => {
      switch (batch.status) {
        case "In-Process":
          // Assuming "In-Process" is equivalent to "In Progress" in the UI
          inProgressCount++;
          break;
        case "Released":
          releasedCount++;
          break;
        case "On-Hold":
          // Assuming "On-Hold" is equivalent to "QA Hold" in the UI
          qaHoldCount++;
          break;
        case "Awaiting Coa":
          // The model does not have a direct status for "Awaiting Coa".
          // This is a placeholder count based on the UI.
          // In a real application, you would derive this from the BatchComponent model.
          awaitingCoaCount++;
          break;
        // Logic for "Not Started" - assuming a batch with no process steps has not started.
        default:
          if (batch.process_steps.length === 0) {
            notStartedCount++;
          }
          break;
      }
    });

    const stats = {
      totalBatchesCount,
      notStartedCount,
      inProgressCount,
      qaHoldCount,
      releasedCount,
      awaitingCoaCount,
    };

    // Format the data to match the desired response structure
    const formattedBatches = batches.map((batch) => {
      // Calculate progress percentage based on completed process steps
      const totalSteps = batch.process_steps.length;
      const completedSteps = batch.process_steps.filter(
        (step) => step.end_timestamp
      ).length;
      const progress =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Count critical deviations
      const criticalDeviations = batch.deviations.filter(
        (d) => d.severity === "Critical"
      ).length;
      const nonCriticalDeviations = batch.deviations.filter(
        (d) => d.severity !== "Critical"
      ).length;

      return {
        _id: batch._id, // Include the batch _id as requested
        api_batch_id: batch.api_batch_id,
        product: batch.project ? batch.project.project_name : "N/A", // Use project_name as product
        customer: batch.customer ? batch.customer.name : "N/A",
        status: batch.status,
        progress,
        deviations: {
          total: batch.deviations.length,
          critical: criticalDeviations,
          non_critical: nonCriticalDeviations,
        },
        samples: batch.samples.length,
        // The image shows a "Target Release" date. This is not in the schema.
        // I will add a placeholder for it here. In a real app, you would
        // either add it to your schema or derive it from the project.
        target_release: "N/A",
        actions: {
          view_details: `/api/batches/${batch._id}`,
          export_report: `/api/batches/${batch._id}/report`,
        },
      };
    });

    // Send the structured response
    res.status(200).json({
      count: formattedBatches.length,
      batches: formattedBatches,
      stats, // Include the new stats object
    });
  } catch (error) {
    console.error("Error fetching batch overview:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const batchParentDetail = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Validate that the provided ID is a valid Mongoose ObjectId
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Batch ID format",
      });
    }

    // Find the batch and populate essential details
    const batch = await BatchModel.findById(batchId)
      .populate("customer", "name")
      .populate("project", "project_name project_code");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // 1. Calculate Progress
    // We assume progress is based on completed process steps.
    const totalProcessSteps = await ProcessStepModel.countDocuments({
      batch: batchId,
    });
    const completedProcessSteps = await ProcessStepModel.countDocuments({
      batch: batchId,
      status: "Completed", // Assuming a 'Completed' status on the process step model
    });
    const progress =
      totalProcessSteps > 0
        ? (completedProcessSteps / totalProcessSteps) * 100
        : 0;

    // 2. Count Open Deviations
    const openDeviationsCount = await DeviationModel.countDocuments({
      batch: batchId,
      status: "Open",
    });

    // 3. Count Pending Samples
    // We assume a 'pending' sample is one with no associated test results.
    const pendingSamplesCount = await SampleModel.countDocuments({
      batch: batchId,
      "test_results.0": { $exists: false }, // Finds documents where the 'test_results' array is empty
    });

    // 4. Calculate Days to Release
    let daysToRelease = "N/A";
    if (batch.target_release_date) {
      const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
      const now = new Date();
      const releaseDate = new Date(batch.target_release_date);
      const diffDays = Math.round((releaseDate - now) / oneDay);
      daysToRelease = diffDays > 0 ? diffDays : 0;
    }

    // 5. Get Parent Batch ID (This assumes a 'parent_batch' field on the BatchModel)
    // If your schema does not have this, you would need to adjust the logic.
    // For now, we will add a placeholder.
    let parentBatchApiId = "N/A";
    if (batch.parent_batch) {
      const parentBatch = await BatchModel.findById(batch.parent_batch);
      parentBatchApiId = parentBatch ? parentBatch.api_batch_id : "N/A";
    }

    // Construct the response
    const responseData = {
      batch: {
        _id: batch._id,
        api_batch_id: batch.api_batch_id,
        parent_batch_api_id: parentBatchApiId,
        product_name: batch.product_name,
        product_code: batch.project ? batch.project.project_code : "N/A",
        customer: batch.customer ? batch.customer.name : "N/A",
        manufacturing_site: batch.manufacturing_site || "N/A",
        created_date: batch.createdAt,
        last_updated: batch.updatedAt,
        target_release: batch.target_release_date,
      },
      stats: {
        progress: `${Math.round(progress)}%`,
        open_deviations: openDeviationsCount,
        pending_samples: pendingSamplesCount,
        days_to_release: daysToRelease,
      },
    };

    console.log(`📊 Dashboard accessed for Batch: ${batchId}`);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error fetching batch dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const batchDetailSummay = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Main batch aggregation with all required data
    const batchData = await BatchModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(batchId) } },

      // Lookup customer with default values
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
          pipeline: [
            {
              $project: {
                name: { $ifNull: ["$name", "Unknown Customer"] },
                country: { $ifNull: ["$country", "N/A"] },
                contact_person: { $ifNull: ["$contact_person", "N/A"] },
                email: { $ifNull: ["$email", "N/A"] },
                phone: { $ifNull: ["$phone", "N/A"] },
              },
            },
          ],
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      // Lookup project with default values
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
          pipeline: [
            {
              $project: {
                project_code: { $ifNull: ["$project_code", "N/A"] },
                project_name: { $ifNull: ["$project_name", "Unknown Product"] },
                status: { $ifNull: ["$status", "Unknown"] },
              },
            },
          ],
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },

      // Lookup process steps for progress calculation
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
                qa_approval_status: 1,
                start_timestamp: 1,
                end_timestamp: 1,
              },
            },
          ],
        },
      },

      // Lookup samples
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
              $lookup: {
                from: "capas",
                localField: "resolution.linked_capa",
                foreignField: "_id",
                as: "linkedCapa",
              },
            },
            {
              $project: {
                deviation_no: 1,
                title: 1,
                severity: 1,
                status: 1,
                raised_at: 1,
                description: 1,
                resolution: 1,
                linkedCapa: { $arrayElemAt: ["$linkedCapa", 0] },
              },
            },
          ],
        },
      },

      // Lookup equipment events and equipment details
      {
        $lookup: {
          from: "equipmentevents",
          localField: "_id",
          foreignField: "related_batch",
          as: "equipmentEvents",
          pipeline: [
            {
              $lookup: {
                from: "equipment",
                localField: "equipment",
                foreignField: "_id",
                as: "equipmentDetails",
              },
            },
            {
              $project: {
                equipment: 1,
                event_type: 1,
                timestamp: 1,
                notes: 1,
                equipmentDetails: { $arrayElemAt: ["$equipmentDetails", 0] },
              },
            },
          ],
        },
      },

      // Lookup batch components for genealogy
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
                supplier_lot_id: 1,
                internal_lot_id: 1,
                qc: 1,
                usage_ts: 1,
              },
            },
          ],
        },
      },

      // Calculate derived fields
      {
        $addFields: {
          // Ensure customer data exists with defaults
          customer: {
            $ifNull: [
              "$customer",
              {
                name: "Unknown Customer",
                country: "N/A",
                contact_person: "N/A",
                email: "N/A",
                phone: "N/A",
              },
            ],
          },

          // Ensure project data exists with defaults
          project: {
            $ifNull: [
              "$project",
              {
                project_code: "N/A",
                project_name: "Unknown Product",
                status: "Unknown",
              },
            ],
          },

          // Calculate progress percentage
          progressPercentage: {
            $cond: [
              { $gt: [{ $size: "$processSteps" }, 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: "$processSteps",
                            cond: {
                              $eq: ["$$this.qa_approval_status", "Approved"],
                            },
                          },
                        },
                      },
                      { $size: "$processSteps" },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },

          // Count open deviations
          openDeviationsCount: {
            $size: {
              $filter: {
                input: "$deviations",
                cond: { $in: ["$$this.status", ["Open", "In-Progress"]] },
              },
            },
          },

          // Count pending samples (samples with pending tests)
          pendingSamplesCount: {
            $size: {
              $filter: {
                input: "$samples",
                cond: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$$this.testResults",
                          cond: {
                            $in: ["$$this.result", ["Pending", "In-Progress"]],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },

          // Calculate days to release
          daysToRelease: {
            $cond: [
              { $eq: ["$status", "Released"] },
              0,
              {
                $divide: [
                  { $subtract: [new Date(), "$createdAt"] },
                  86400000, // milliseconds in a day
                ],
              },
            ],
          },

          // Manufacturing stats
          totalProcessSteps: { $size: "$processSteps" },
          completedProcessSteps: {
            $size: {
              $filter: {
                input: "$processSteps",
                cond: { $eq: ["$$this.qa_approval_status", "Approved"] },
              },
            },
          },
          pendingProcessSteps: {
            $size: {
              $filter: {
                input: "$processSteps",
                cond: { $ne: ["$$this.qa_approval_status", "Approved"] },
              },
            },
          },

          // Sample stats
          totalSamples: { $size: "$samples" },
          testedSamples: {
            $size: {
              $filter: {
                input: "$samples",
                cond: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$$this.testResults",
                          cond: { $eq: ["$$this.result", "Pass"] },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },

          // Deviation stats
          totalDeviations: { $size: "$deviations" },
          resolvedDeviations: {
            $size: {
              $filter: {
                input: "$deviations",
                cond: { $eq: ["$$this.status", "Closed"] },
              },
            },
          },

          // Equipment stats
          totalEquipmentUsed: { $size: "$equipmentEvents" },
          uniqueEquipment: {
            $size: {
              $setUnion: ["$equipmentEvents.equipment", []],
            },
          },
        },
      },

      // Final projection
      {
        $project: {
          // Basic batch info
          _id: 1,
          api_batch_id: 1,
          status: 1,
          createdAt: 1,
          released_at: 1,
          released_by: 1,

          // Customer & Project info with defaults
          customer: 1,
          project: 1,

          // Batch summary fields
          batchSummary: {
            customerName: "$customer.name",
            projectCode: "$project.project_code",
            productName: "$project.project_name",
            plantLocation: {
              $ifNull: ["$plant_location", "Main Manufacturing Site"],
            },
            manufacturingOrderId: "$api_batch_id",
            batchStatus: "$status",
            startDate: "$createdAt",
            endDate: { $ifNull: ["$released_at", null] },
            dataSource: { $ifNull: ["$data_source", "MES/LIMS/QMS"] },
            targetYield: { $ifNull: ["$target_yield", "N/A"] },
          },

          // Card summary
          cardSummary: {
            progress: { $round: ["$progressPercentage", 0] },
            openDeviations: "$openDeviationsCount",
            pendingSamples: "$pendingSamplesCount",
            daysToRelease: { $round: ["$daysToRelease", 0] },
          },

          // Overview tab data
          overview: {
            manufacturing: {
              total: "$totalProcessSteps",
              completed: "$completedProcessSteps",
              pending: "$pendingProcessSteps",
            },
            samples: {
              total: "$totalSamples",
              tested: "$testedSamples",
              pending: "$pendingSamplesCount",
            },
            deviations: {
              total: "$totalDeviations",
              resolved: "$resolvedDeviations",
              pending: "$openDeviationsCount",
            },
            equipment: {
              totalUsed: "$totalEquipmentUsed",
              uniqueEquipment: "$uniqueEquipment",
            },
          },

          // Tab data
          processSteps: 1,
          samples: 1,
          deviations: 1,
          equipmentEvents: 1,
          components: 1,
        },
      },
    ]);

    if (!batchData.length) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const batch = batchData[0];

    // Get equipment calibration status
    const uniqueEquipmentIds = [
      ...new Set(batch.equipmentEvents.map((e) => e.equipment)),
    ];
    const equipmentCalibrationStatus = await EquipmentModel.find({
      _id: { $in: uniqueEquipmentIds },
    }).select("_id name calibration_status last_calibrated_on");

    // Find overdue calibrations
    const overdueEquipment = equipmentCalibrationStatus.filter(
      (eq) =>
        eq.calibration_status === "Expired" ||
        eq.calibration_status === "Due Soon"
    );

    // Audit log
    console.log(
      `📊 Batch detailed summary accessed - Batch: ${batchId}, User: ${
        req.headers["user-id"] || "anonymous"
      }, Timestamp: ${new Date()}`
    );

    res.json({
      success: true,
      data: {
        ...batch,
        equipmentCalibrationStatus,
        overdueEquipment: overdueEquipment.map((eq) => ({
          equipment_id: eq._id,
          name: eq.name,
          calibration_status: eq.calibration_status,
          last_calibrated_on: eq.last_calibrated_on,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching batch detailed summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const batchGenealogy = async (req, res) => {
  try {
    const { batchId } = req.params;

    const genealogyData = await BatchComponentModel.aggregate([
      { $match: { batch: new mongoose.Types.ObjectId(batchId) } },

      // Group by component type for better organization
      {
        $group: {
          _id: "$component_type",
          components: {
            $push: {
              _id: "$_id",
              component_batch_id: "$component_batch_id",
              component_name: "$component_name",
              material_code_component: "$material_code_component",
              supplier_name: { $ifNull: ["$supplier_name", "Internal"] },
              supplier_lot_id: { $ifNull: ["$supplier_lot_id", "N/A"] },
              internal_lot_id: { $ifNull: ["$internal_lot_id", "N/A"] },
              quantity_used: { $ifNull: ["$quantity_used", 0] },
              uom: { $ifNull: ["$uom", "N/A"] },
              usage_ts: "$usage_ts",
              qc: "$qc",
              coa: "$coa",
            },
          },
          totalQuantity: { $sum: { $ifNull: ["$quantity_used", 0] } },
          componentCount: { $sum: 1 },
        },
      },

      {
        $project: {
          componentType: "$_id",
          components: 1,
          totalQuantity: 1,
          componentCount: 1,
          _id: 0,
        },
      },

      { $sort: { componentType: 1 } },
    ]);

    // Get batch info for context
    const batchInfo = await BatchModel.findById(batchId)
      .select("api_batch_id status createdAt")
      .populate("customer", "name")
      .populate("project", "project_name");

    res.json({
      success: true,
      data: {
        batch: batchInfo,
        genealogy: genealogyData,
        summary: {
          totalComponentTypes: genealogyData.length,
          totalComponents: genealogyData.reduce(
            (sum, group) => sum + group.componentCount,
            0
          ),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching genealogy data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const sampleTests = async (req, res) => {
  try {
    const { batchId } = req.params;

    const samplesData = await SampleModel.aggregate([
      { $match: { batch: new mongoose.Types.ObjectId(batchId) } },

      // Lookup test results
      {
        $lookup: {
          from: "testresults",
          localField: "_id",
          foreignField: "sample",
          as: "testResults",
          pipeline: [
            {
              $project: {
                test_id: 1,
                method_id: 1,
                parameter: 1,
                value: 1,
                unit: 1,
                result: 1,
                tested_at: 1,
                tested_by: 1,
                equipment_used: 1,
                reagents: 1,
                remarks: 1,
              },
            },
            { $sort: { tested_at: -1 } },
          ],
        },
      },

      // Lookup user who collected sample
      {
        $lookup: {
          from: "users",
          localField: "collected_by",
          foreignField: "_id",
          as: "collectedBy",
        },
      },

      {
        $addFields: {
          collectedByName: {
            $ifNull: [{ $arrayElemAt: ["$collectedBy.name", 0] }, "Unknown"],
          },
          totalTests: { $size: "$testResults" },
          passedTests: {
            $size: {
              $filter: {
                input: "$testResults",
                cond: { $eq: ["$$this.result", "Pass"] },
              },
            },
          },
          failedTests: {
            $size: {
              $filter: {
                input: "$testResults",
                cond: { $eq: ["$$this.result", "Fail"] },
              },
            },
          },
          pendingTests: {
            $size: {
              $filter: {
                input: "$testResults",
                cond: { $in: ["$$this.result", ["Pending", "In-Progress"]] },
              },
            },
          },
        },
      },

      {
        $project: {
          sample_id: 1,
          sample_type: 1,
          collected_at: 1,
          collectedByName: 1,
          storage_location: { $ifNull: ["$storage_location", "Not specified"] },
          remarks: { $ifNull: ["$remarks", ""] },
          testResults: 1,
          totalTests: 1,
          passedTests: 1,
          failedTests: 1,
          pendingTests: 1,
        },
      },

      { $sort: { collected_at: -1 } },
    ]);

    // Calculate overall statistics
    const overallStats = {
      totalSamples: samplesData.length,
      totalTests: samplesData.reduce(
        (sum, sample) => sum + sample.totalTests,
        0
      ),
      totalPassed: samplesData.reduce(
        (sum, sample) => sum + sample.passedTests,
        0
      ),
      totalFailed: samplesData.reduce(
        (sum, sample) => sum + sample.failedTests,
        0
      ),
      totalPending: samplesData.reduce(
        (sum, sample) => sum + sample.pendingTests,
        0
      ),
    };

    // Find OOS (Out of Specification) results
    const oosResults = samplesData.flatMap((sample) =>
      sample.testResults
        .filter((test) => test.result === "Fail")
        .map((test) => ({
          sample_id: sample.sample_id,
          sample_type: sample.sample_type,
          test_id: test.test_id,
          parameter: test.parameter,
          value: test.value,
          unit: test.unit,
          tested_at: test.tested_at,
          remarks: test.remarks,
        }))
    );

    res.json({
      success: true,
      data: {
        samples: samplesData,
        overallStats,
        oosResults,
        sampleTypes: [...new Set(samplesData.map((s) => s.sample_type))],
      },
    });
  } catch (error) {
    console.error("❌ Error fetching samples and tests data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getDeviationsCapa = async (req, res) => {
  try {
    const { batchId } = req.params;

    const deviationsData = await DeviationModel.aggregate([
      { $match: { batch: new mongoose.Types.ObjectId(batchId) } },

      // Lookup linked CAPA
      {
        $lookup: {
          from: "capas",
          localField: "resolution.linked_capa",
          foreignField: "_id",
          as: "linkedCapa",
        },
      },

      // Lookup user who raised deviation
      {
        $lookup: {
          from: "users",
          localField: "raised_by",
          foreignField: "_id",
          as: "raisedBy",
        },
      },

      // Lookup user who closed deviation
      {
        $lookup: {
          from: "users",
          localField: "resolution.closed_by",
          foreignField: "_id",
          as: "closedBy",
        },
      },

      {
        $addFields: {
          raisedByName: {
            $ifNull: [{ $arrayElemAt: ["$raisedBy.name", 0] }, "Unknown"],
          },
          closedByName: {
            $ifNull: [{ $arrayElemAt: ["$closedBy.name", 0] }, null],
          },
          linkedCapaDetails: { $arrayElemAt: ["$linkedCapa", 0] },
          daysOpen: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ["$resolution.closed_at", new Date()] },
                  "$raised_at",
                ],
              },
              86400000, // milliseconds in a day
            ],
          },
        },
      },

      {
        $project: {
          deviation_no: 1,
          title: 1,
          description: 1,
          severity: 1,
          status: 1,
          raised_at: 1,
          raised_by: "$raisedByName",
          linked_entity: 1,
          resolution: {
            action_taken: 1,
            closed_at: 1,
            closed_by: "$closedByName",
          },
          linkedCapaDetails: {
            _id: 1,
            title: 1,
            status: 1,
            opened_at: 1,
            closed_at: 1,
          },
          daysOpen: { $round: ["$daysOpen", 1] },
        },
      },

      { $sort: { raised_at: -1 } },
    ]);

    // Calculate statistics
    const deviationStats = {
      total: deviationsData.length,
      open: deviationsData.filter((d) =>
        ["Open", "In-Progress"].includes(d.status)
      ).length,
      closed: deviationsData.filter((d) => d.status === "Closed").length,
      critical: deviationsData.filter((d) => d.severity === "Critical").length,
      major: deviationsData.filter((d) => d.severity === "Major").length,
      minor: deviationsData.filter((d) => d.severity === "Minor").length,
      withCapa: deviationsData.filter((d) => d.linkedCapaDetails).length,
    };

    // Get all related CAPAs
    const capaIds = deviationsData
      .filter((d) => d.linkedCapaDetails)
      .map((d) => d.linkedCapaDetails._id);

    const relatedCapas = await CapaModel.find({
      _id: { $in: capaIds },
    }).populate("owner", "name");

    res.json({
      success: true,
      data: {
        deviations: deviationsData,
        deviationStats,
        relatedCapas,
        severityBreakdown: {
          critical: deviationStats.critical,
          major: deviationStats.major,
          minor: deviationStats.minor,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching deviations and CAPA data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getEquipmentsDetailsByID = async (req, res) => {
  try {
    const { batchId } = req.params;

    const equipmentData = await EquipmentEventModel.aggregate([
      { $match: { related_batch: new mongoose.Types.ObjectId(batchId) } },

      // Lookup equipment details
      {
        $lookup: {
          from: "equipment",
          localField: "equipment",
          foreignField: "_id",
          as: "equipmentDetails",
        },
      },
      {
        $unwind: {
          path: "$equipmentDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup related process step
      {
        $lookup: {
          from: "processsteps",
          localField: "related_process_step",
          foreignField: "_id",
          as: "processStep",
        },
      },

      // Group by equipment to avoid duplicates
      {
        $group: {
          _id: "$equipment",
          equipmentDetails: { $first: "$equipmentDetails" },
          events: {
            $push: {
              event_type: "$event_type",
              timestamp: "$timestamp",
              notes: "$notes",
              processStep: { $arrayElemAt: ["$processStep.step_name", 0] },
            },
          },
          lastUsed: { $max: "$timestamp" },
          totalEvents: { $sum: 1 },
        },
      },

      {
        $addFields: {
          // Calculate calibration status urgency
          calibrationUrgency: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$equipmentDetails.calibration_status", "Expired"],
                  },
                  then: "High",
                },
                {
                  case: {
                    $eq: ["$equipmentDetails.calibration_status", "Due Soon"],
                  },
                  then: "Medium",
                },
                {
                  case: {
                    $eq: ["$equipmentDetails.calibration_status", "Valid"],
                  },
                  then: "Low",
                },
              ],
              default: "Unknown",
            },
          },

          // Calculate days since last calibration
          daysSinceCalibration: {
            $cond: [
              { $ne: ["$equipmentDetails.last_calibrated_on", null] },
              {
                $divide: [
                  {
                    $subtract: [
                      new Date(),
                      "$equipmentDetails.last_calibrated_on",
                    ],
                  },
                  86400000,
                ],
              },
              null,
            ],
          },
        },
      },

      {
        $project: {
          equipment_id: "$_id",
          name: { $ifNull: ["$equipmentDetails.name", "Unknown Equipment"] },
          model: { $ifNull: ["$equipmentDetails.model", "N/A"] },
          location: { $ifNull: ["$equipmentDetails.location", "N/A"] },
          calibration_status: {
            $ifNull: ["$equipmentDetails.calibration_status", "Unknown"],
          },
          last_calibrated_on: "$equipmentDetails.last_calibrated_on",
          last_cleaned_on: "$equipmentDetails.last_cleaned_on",
          status: { $ifNull: ["$equipmentDetails.status", "Unknown"] },
          calibrationUrgency: 1,
          daysSinceCalibration: { $round: ["$daysSinceCalibration", 0] },
          events: 1,
          lastUsed: 1,
          totalEvents: 1,
        },
      },

      { $sort: { calibrationUrgency: -1, name: 1 } },
    ]);

    // Calculate equipment statistics
    const equipmentStats = {
      totalEquipment: equipmentData.length,
      validCalibration: equipmentData.filter(
        (e) => e.calibration_status === "Valid"
      ).length,
      expiredCalibration: equipmentData.filter(
        (e) => e.calibration_status === "Expired"
      ).length,
      dueSoonCalibration: equipmentData.filter(
        (e) => e.calibration_status === "Due Soon"
      ).length,
      highUrgency: equipmentData.filter((e) => e.calibrationUrgency === "High")
        .length,
      mediumUrgency: equipmentData.filter(
        (e) => e.calibrationUrgency === "Medium"
      ).length,
    };

    // Highlight overdue equipment
    const overdueEquipment = equipmentData.filter((e) =>
      ["Expired", "Due Soon"].includes(e.calibration_status)
    );

    res.json({
      success: true,
      data: {
        equipment: equipmentData,
        equipmentStats,
        overdueEquipment,
        calibrationAlerts: overdueEquipment.map((eq) => ({
          equipment_id: eq.equipment_id,
          name: eq.name,
          calibration_status: eq.calibration_status,
          urgency: eq.calibrationUrgency,
          days_since_calibration: eq.daysSinceCalibration,
          message: `${eq.name} (${eq.equipment_id}) - ${eq.calibration_status}`,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching equipment data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const performBatchActions = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { action, userId, notes = "" } = req.body;

    const validActions = ["release", "hold", "reject", "resume"];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action provided",
      });
    }

    const batch = await BatchModel.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Business rules for actions
    if (action === "release") {
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
    }

    // Update batch based on action
    const updateData = {
      updatedAt: new Date(),
    };

    switch (action) {
      case "release":
        updateData.status = "Released";
        updateData.released_at = new Date();
        updateData.released_by = userId;
        break;
      case "hold":
        updateData.status = "On-Hold";
        break;
      case "reject":
        updateData.status = "Rejected";
        break;
      case "resume":
        updateData.status = "In-Process";
        break;
    }

    const updatedBatch = await BatchModel.findByIdAndUpdate(
      batchId,
      { $set: updateData },
      { new: true }
    )
      .populate("customer", "name")
      .populate("project", "project_name");

    // Audit log
    console.log(
      `🔄 Batch action performed - Batch: ${batchId}, Action: ${action}, User: ${userId}, Timestamp: ${new Date()}`
    );

    res.json({
      success: true,
      message: `Batch ${action}d successfully`,
      data: {
        batchId: updatedBatch._id,
        api_batch_id: updatedBatch.api_batch_id,
        status: updatedBatch.status,
        action: action,
        performedAt: new Date(),
        performedBy: userId,
      },
    });
  } catch (error) {
    console.error("❌ Error performing batch action:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
