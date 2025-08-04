import mongoose from "mongoose";
import { BatchModel } from "../models/batchModel.js";
import { BatchComponentModel } from "../models/batchComponentModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { TestResultModel } from "../models/testResultModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { ProcessStepModel } from "../models/processStepModel.js";
class GenealogyController {
  // ================================
  // GET BATCH GENEALOGY
  // Route: GET /api/batches/:batchId/genealogy
  // Purpose: Get complete genealogy table with hierarchical data
  // ================================

  async getBatchGenealogy(req, res) {
    try {
      const { batchId } = req.params;

      // Validate batch exists without populating customer or project details
      const batch = await BatchModel.findById(batchId);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Get genealogy data with all details in a single, optimized aggregation pipeline
      const genealogyData = await ProcessStepModel.aggregate([
        // Match process steps for the given batch ID
        { $match: { batch: new mongoose.Types.ObjectId(batchId) } },
        // Sort them by sequence number
        { $sort: { step_sequence: 1 } },

        // --- OPTIMIZED LOOKUP STAGES ---

        // 1. Lookup batch components using the related_component_ids field
        {
          $lookup: {
            from: "batchcomponents",
            localField: "related_component_ids",
            foreignField: "_id",
            as: "components",
          },
        },

        // 2. Unwind the components array to process each component individually
        {
          $unwind: "$components",
        },

        // 3. Lookup samples with their test results in a nested sub-pipeline
        {
          $lookup: {
            from: "samples",
            let: { componentId: "$components._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$batch_component_ID", "$$componentId"] },
                },
              },
              // Lookup the test results data for each sample
              {
                $lookup: {
                  from: "testresults",
                  localField: "test_results",
                  foreignField: "_id",
                  as: "test_results_data",
                },
              },
              // Calculate the status of each sample
              {
                $addFields: {
                  status: {
                    $cond: {
                      if: { $eq: [{ $size: "$test_results_data" }, 0] },
                      then: "Pending",
                      else: {
                        $cond: {
                          if: {
                            $in: ["Failed", "$test_results_data.status"],
                          },
                          then: "Failed",
                          else: "Passed",
                        },
                      },
                    },
                  },
                },
              },
              // Final projection for the sample data
              {
                $project: {
                  _id: 1,
                  sample_id: 1,
                  sample_type: 1,
                  status: 1,
                },
              },
            ],
            as: "components.samples",
          },
        },

        // 4. Lookup deviations for each component
        {
          $lookup: {
            from: "deviations",
            let: { componentId: "$components._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    // Only check for a match between componentId and linked_entity.entity_id
                    $eq: [
                      "$linked_entity.entity_id",
                      { $toString: "$$componentId" },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  deviation_no: 1,
                  status: 1,
                  severity: 1,
                  title: 1,
                  entity_type: "$linked_entity.entity_type",
                },
              },
            ],
            as: "components.deviations",
          },
        },

        // --- FINAL PROJECT STAGE ---

        // Project the data into a clean, combined document structure
        {
          $project: {
            _id: "$_id",
            step_name: "$step_name",
            step_sequence: "$step_sequence",
            batch: "$batch",
            api_batch_id: "$api_batch_id",
            components: "$components",
          },
        },
      ]);

      // Flatten the genealogy entries for table display
      const flattenedGenealogy = [];
      genealogyData.forEach((processStep) => {
        // The aggregation now produces a flattened structure, so we can directly
        // access the component data.
        const entry = processStep.components;
        flattenedGenealogy.push({
          processName: `${processStep.step_name} (${processStep.api_batch_id})`,
          componentId: entry._id, // Added component ID to the output
          materialId: entry.material_code_component,
          materialName: entry.component_name,
          lotNumber: entry.internal_lot_id,
          supplier: entry.supplier_name || "Internal",
          quantityUsed: `${entry.quantity_used || 0} ${entry.uom || "units"}`,
          coaReport: entry.coa?.received ? "Yes" : "No",
          batchDescription: (() => {
            // Self-invoking function to determine the description
            switch (entry.component_type) {
              case "API":
                return "Primary therapeutic compound for pharmaceutical treatment";
              case "Raw Material":
              case "Excipient":
              case "Intermediate":
                return "Raw material component for manufacturing process";
              default:
                return "Manufacturing component";
            }
          })(),
          associatedBatch: entry.component_batch_id,
          // Check for deviations directly on the component
          hasDeviationLink: entry.deviations && entry.deviations.length > 0,
          // Note: deviationInfo has been removed as per your request.
          stepSequence: processStep.step_sequence,
          batchId: processStep.batch,
          // Add the samples and deviations arrays to each entry for the pop-up UI
          samples: entry.samples,
          deviations: entry.deviations,
        });
      });

      // Sort by step sequence for chronological order
      flattenedGenealogy.sort((a, b) => a.stepSequence - b.stepSequence);

      res.json({
        success: true,
        data: {
          batch: {
            _id: batch._id,
            api_batch_id: batch.api_batch_id,
            status: batch.status,
            batchId: batch._id,
          },
          genealogyTable: flattenedGenealogy,
          summary: {
            totalEntries: flattenedGenealogy.length,
            processSteps: genealogyData.length,
            deviationLinkedBatches: flattenedGenealogy.filter(
              (entry) => entry.hasDeviationLink
            ).length,
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
  }

  // ================================
  // GET BATCH DETAILS
  // Route: GET /api/batches/:batchId/batch-details
  // Purpose: Get batch details with samples and deviations for popup
  // ================================

  async getBatchPopupDetails(req, res) {
    try {
      const { batchId } = req.params;

      // Get batch basic info
      const batch = await BatchModel.findById(batchId)
        .populate("customer", "name")
        .populate("project", "project_name");

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Get samples that have deviations
      const samplesWithDeviations = await SampleModel.aggregate([
        { $match: { batch: new mongoose.Types.ObjectId(batchId) } },

        // Lookup deviations linked to this sample
        {
          $lookup: {
            from: "deviations",
            let: { sampleId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$linked_entity.sample", "$$sampleId"] },
                      { $eq: ["$batch", new mongoose.Types.ObjectId(batchId)] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  deviation_no: 1,
                  title: 1,
                  severity: 1,
                  status: 1,
                  raised_at: 1,
                },
              },
            ],
            as: "deviations",
          },
        },

        // Only include samples that have deviations
        {
          $match: {
            "deviations.0": { $exists: true },
          },
        },

        // Lookup test results for each sample
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
                  parameter: 1,
                  result: 1,
                  value: 1,
                  unit: 1,
                  tested_at: 1,
                },
              },
            ],
          },
        },

        {
          $project: {
            _id: 1, // Sample ObjectId for API calls
            sample_id: 1,
            sample_type: 1,
            collected_at: 1,
            testResults: 1,
            deviations: 1,
            // Format test results for UI display
            formattedTests: {
              $map: {
                input: "$testResults",
                as: "test",
                in: {
                  testName: "$$test.parameter",
                  sampleId: "$sample_id",
                  testType: { $ifNull: ["$$test.parameter", "Physical"] },
                  status: {
                    $cond: [
                      { $eq: ["$$test.result", "Pass"] },
                      "Passed",
                      {
                        $cond: [
                          { $eq: ["$$test.result", "Fail"] },
                          "Failed",
                          "Pending",
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },

        { $sort: { collected_at: -1 } },
      ]);

      // Get all deviations for this batch (not just sample-linked ones)
      const allDeviations = await DeviationModel.find({
        batch: batchId,
      }).select("_id deviation_no title severity status raised_at");

      // Format response data
      const responseData = {
        // Batch Details (instead of Intermediate Process Details)
        processName: `Batch Details`,
        intermediateBatchId: batch.api_batch_id,
        processStatus: batch.status || "completed",
        yield: batch.yield || "88%", // Default to 88% if not present

        // Samples Taken (only samples with deviations)
        samplesTaken: samplesWithDeviations.map((sample) => ({
          _id: sample._id, // Sample ObjectId for API calls
          testName:
            sample.formattedTests.length > 0
              ? sample.formattedTests[0].testName
              : "Unknown Test",
          sampleId: sample.sample_id,
          testType:
            sample.formattedTests.length > 0
              ? sample.formattedTests[0].testType
              : "Physical",
          status:
            sample.formattedTests.length > 0
              ? sample.formattedTests[0].status
              : "Passed",
        })),

        // Deviations
        deviations:
          allDeviations.length > 0
            ? allDeviations.map((deviation) => ({
                _id: deviation._id, // Deviation ObjectId for API calls
                deviation_no: deviation.deviation_no,
                title: deviation.title,
                severity: deviation.severity,
                status: deviation.status,
                raised_at: deviation.raised_at,
              }))
            : null,
      };

      // Audit log
      console.log(
        `📋 Batch details accessed - Batch: ${batchId}, User: ${
          req.headers["user-id"] || "anonymous"
        }`
      );

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("❌ Error fetching batch details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET DEVIATION-LINKED BATCH DETAILS (POPUP)
  // Route: GET /api/batches/:batchId/deviation-linked-details
  // Purpose: Get detailed popup data for red-highlighted batches
  // ================================

  async getDeviationLinkedBatchDetails(req, res) {
    try {
      const { batchId } = req.params;

      // Get all samples for this batch
      const samplesWithTests = await SampleModel.aggregate([
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
                  parameter: 1,
                  value: 1,
                  unit: 1,
                  result: 1,
                  tested_at: 1,
                  method_id: 1,
                  remarks: 1,
                },
              },
            ],
          },
        },

        // Lookup deviations linked to this sample
        {
          $lookup: {
            from: "deviations",
            let: { sampleId: "$_id", batchId: "$batch" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$linked_entity.sample", "$$sampleId"] },
                      { $eq: ["$batch", "$$batchId"] },
                    ],
                  },
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
                },
              },
            ],
            as: "linkedDeviations",
          },
        },

        {
          $project: {
            sample_id: 1,
            sample_type: 1,
            collected_at: 1,
            storage_location: 1,
            remarks: 1,
            testResults: 1,
            linkedDeviations: 1,
            hasDeviations: { $gt: [{ $size: "$linkedDeviations" }, 0] },
            testCount: { $size: "$testResults" },
            deviationCount: { $size: "$linkedDeviations" },
          },
        },

        { $sort: { collected_at: -1 } },
      ]);

      // Get batch info
      const batchInfo = await BatchModel.findById(batchId)
        .select("api_batch_id status createdAt")
        .populate("customer", "name")
        .populate("project", "project_name");

      if (!batchInfo) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Get all unique deviations for this batch
      const allDeviations = await DeviationModel.find({
        batch: batchId,
      }).select("deviation_no title severity status raised_at description");

      res.json({
        success: true,
        data: {
          batch: batchInfo,
          samples: samplesWithTests,
          deviations: allDeviations,
          summary: {
            totalSamples: samplesWithTests.length,
            samplesWithDeviations: samplesWithTests.filter(
              (s) => s.hasDeviations
            ).length,
            totalDeviations: allDeviations.length,
            totalTests: samplesWithTests.reduce(
              (sum, s) => sum + s.testCount,
              0
            ),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching deviation-linked batch details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET SAMPLE DETAILS
  // Route: GET /api/samples/:sampleId/details
  // Purpose: Get detailed sample information for navigation
  // ================================

  async getSampleDetails(req, res) {
    try {
      const { sampleId } = req.params;

      const sampleDetails = await SampleModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(sampleId) } },

        // Lookup batch info
        {
          $lookup: {
            from: "batches",
            localField: "batch",
            foreignField: "_id",
            as: "batch",
            pipeline: [
              {
                $project: {
                  api_batch_id: 1,
                  status: 1,
                },
              },
            ],
          },
        },
        { $unwind: "$batch" },

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
                  parameter: 1,
                  value: 1,
                  unit: 1,
                  result: 1,
                  tested_at: 1,
                  method_id: 1,
                  remarks: 1,
                  equipment_used: 1,
                },
              },
              { $sort: { tested_at: -1 } },
            ],
          },
        },

        // Lookup collected by user
        {
          $lookup: {
            from: "users",
            localField: "collected_by",
            foreignField: "_id",
            as: "collectedBy",
          },
        },

        {
          $project: {
            sample_id: 1,
            sample_type: 1,
            collected_at: 1,
            storage_location: 1,
            remarks: 1,
            batch: 1,
            testResults: 1,
            collectedBy: { $arrayElemAt: ["$collectedBy.name", 0] },
            testSummary: {
              total: { $size: "$testResults" },
              passed: {
                $size: {
                  $filter: {
                    input: "$testResults",
                    cond: { $eq: ["$$this.result", "Pass"] },
                  },
                },
              },
              failed: {
                $size: {
                  $filter: {
                    input: "$testResults",
                    cond: { $eq: ["$$this.result", "Fail"] },
                  },
                },
              },
              pending: {
                $size: {
                  $filter: {
                    input: "$testResults",
                    cond: {
                      $in: ["$$this.result", ["Pending", "In-Progress"]],
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      if (!sampleDetails.length) {
        return res.status(404).json({
          success: false,
          message: "Sample not found",
        });
      }

      res.json({
        success: true,
        data: sampleDetails[0],
      });
    } catch (error) {
      console.error("❌ Error fetching sample details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET DEVIATION DETAILS
  // Route: GET /api/deviations/:deviationId/details
  // Purpose: Get detailed deviation information for navigation
  // ================================

  async getDeviationDetails(req, res) {
    try {
      const { deviationId } = req.params;

      const deviationDetails = await DeviationModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(deviationId) } },

        // Lookup batch info
        {
          $lookup: {
            from: "batches",
            localField: "batch",
            foreignField: "_id",
            as: "batch",
            pipeline: [
              {
                $project: {
                  api_batch_id: 1,
                  status: 1,
                },
              },
            ],
          },
        },
        { $unwind: "$batch" },

        // Lookup linked CAPA
        {
          $lookup: {
            from: "capas",
            localField: "resolution.linked_capa",
            foreignField: "_id",
            as: "linkedCapa",
          },
        },

        // Lookup users
        {
          $lookup: {
            from: "users",
            localField: "raised_by",
            foreignField: "_id",
            as: "raisedBy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "resolution.closed_by",
            foreignField: "_id",
            as: "closedBy",
          },
        },

        // Lookup linked sample if exists
        {
          $lookup: {
            from: "samples",
            localField: "linked_entity.sample",
            foreignField: "_id",
            as: "linkedSample",
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
            batch: 1,
            linked_entity: 1,
            resolution: {
              action_taken: 1,
              closed_at: 1,
              closed_by: { $arrayElemAt: ["$closedBy.name", 0] },
            },
            raisedBy: { $arrayElemAt: ["$raisedBy.name", 0] },
            linkedCapa: { $arrayElemAt: ["$linkedCapa", 0] },
            linkedSample: { $arrayElemAt: ["$linkedSample", 0] },
            daysOpen: {
              $divide: [
                {
                  $subtract: [
                    { $ifNull: ["$resolution.closed_at", new Date()] },
                    "$raised_at",
                  ],
                },
                86400000,
              ],
            },
          },
        },
      ]);

      if (!deviationDetails.length) {
        return res.status(404).json({
          success: false,
          message: "Deviation not found",
        });
      }

      res.json({
        success: true,
        data: deviationDetails[0],
      });
    } catch (error) {
      console.error("❌ Error fetching deviation details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET BATCH LINEAGE
  // Route: GET /api/batches/:batchId/lineage
  // Purpose: Get hierarchical batch relationships
  // ================================

  async getBatchLineage(req, res) {
    try {
      const { batchId } = req.params;

      // This would implement the hierarchical lineage logic
      // For now, providing a structure for parent/child batch relationships

      const lineageData = await BatchModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(batchId) } },

        // Lookup components to find parent batches
        {
          $lookup: {
            from: "batchcomponents",
            localField: "_id",
            foreignField: "batch",
            as: "components",
          },
        },

        // Find batches that used this batch as a component (child batches)
        {
          $lookup: {
            from: "batchcomponents",
            let: { currentBatchId: "$api_batch_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$component_batch_id", "$$currentBatchId"],
                  },
                },
              },
              {
                $lookup: {
                  from: "batches",
                  localField: "batch",
                  foreignField: "_id",
                  as: "childBatch",
                },
              },
              { $unwind: "$childBatch" },
            ],
            as: "childBatches",
          },
        },

        {
          $project: {
            currentBatch: {
              _id: "$_id",
              api_batch_id: "$api_batch_id",
              status: "$status",
              createdAt: "$createdAt",
            },
            parentMaterials: "$components",
            childBatches: "$childBatches.childBatch",
          },
        },
      ]);

      res.json({
        success: true,
        data: lineageData[0] || {
          currentBatch: null,
          parentMaterials: [],
          childBatches: [],
        },
      });
    } catch (error) {
      console.error("❌ Error fetching batch lineage:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export default new GenealogyController();
