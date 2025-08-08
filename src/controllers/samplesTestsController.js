// ================================
// 2. controllers/samplesTestsController.js
// ================================

import mongoose from "mongoose";
import { BatchModel } from "../models/batchModel.js";
import { SampleModel } from "../models/sampleModel.js";
import { TestResultModel } from "../models/testResultModel.js";
import { UserModel } from "../models/userModel.js";

class SamplesTestsController {
  // ================================
  // GET BATCH SAMPLES & TESTS OVERVIEW
  // Route: GET /api/batches/:batchId/samples-tests
  // Purpose: Main endpoint combining overview KPIs and test results
  // ================================
  // async _getSampleOverviewData(batchId) {
  //   const overviewData = await SampleModel.aggregate([
  //     { $match: { batch: new mongoose.Types.ObjectId(batchId) } },

  //     {
  //       $lookup: {
  //         from: "testresults",
  //         localField: "_id",
  //         foreignField: "sample",
  //         as: "testResults",
  //       },
  //     },

  //     {
  //       $lookup: {
  //         from: "deviations",
  //         let: { sampleId: "$_id" },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: { $eq: ["$linked_entity.sample", "$$sampleId"] },
  //             },
  //           },
  //         ],
  //         as: "deviations",
  //       },
  //     },

  //     {
  //       $group: {
  //         _id: null,
  //         totalSamples: { $sum: 1 },
  //         samplesWithTests: {
  //           $sum: {
  //             $cond: [{ $gt: [{ $size: "$testResults" }, 0] }, 1, 0],
  //           },
  //         },
  //         samplesWithDeviations: {
  //           $sum: {
  //             $cond: [{ $gt: [{ $size: "$deviations" }, 0] }, 1, 0],
  //           },
  //         },
  //         totalTests: { $sum: { $size: "$testResults" } },
  //         passedTests: {
  //           $sum: {
  //             $size: {
  //               $filter: {
  //                 input: "$testResults",
  //                 cond: { $eq: ["$$this.result", "Pass"] },
  //               },
  //             },
  //           },
  //         },
  //         failedTests: {
  //           $sum: {
  //             $size: {
  //               $filter: {
  //                 input: "$testResults",
  //                 cond: { $eq: ["$$this.result", "Fail"] },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },

  //     {
  //       $project: {
  //         totalSamplesNeeded: 6, // This could be dynamic based on batch requirements
  //         samplesTaken: "$totalSamples",
  //         completionPercentage: {
  //           $multiply: [{ $divide: ["$totalSamples", 6] }, 100],
  //         },
  //         samplesWithDeviations: "$samplesWithDeviations",
  //         additionalMetrics: {
  //           totalTests: "$totalTests",
  //           passedTests: "$passedTests",
  //           failedTests: "$failedTests",
  //           passRate: {
  //             $cond: [
  //               { $gt: ["$totalTests", 0] },
  //               {
  //                 $multiply: [
  //                   { $divide: ["$passedTests", "$totalTests"] },
  //                   100,
  //                 ],
  //               },
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   ]);

  //   return (
  //     overviewData[0] || {
  //       totalSamplesNeeded: 6,
  //       samplesTaken: 0,
  //       completionPercentage: 0,
  //       samplesWithDeviations: 0,
  //       additionalMetrics: {
  //         totalTests: 0,
  //         passedTests: 0,
  //         failedTests: 0,
  //         passRate: 0,
  //       },
  //     }
  //   );
  // }

  // async _getTestResultsData(batchId, options) {
  //   const { page, limit, status, search, sortBy, sortOrder } = options;

  //   // Build filter conditions
  //   const matchConditions = {
  //     "sample.batch": new mongoose.Types.ObjectId(batchId),
  //   };

  //   if (status) {
  //     matchConditions.result = status;
  //   }

  //   // Build aggregation pipeline
  //   const pipeline = [
  //     {
  //       $lookup: {
  //         from: "samples",
  //         localField: "sample",
  //         foreignField: "_id",
  //         as: "sample",
  //       },
  //     },
  //     { $unwind: "$sample" },

  //     { $match: matchConditions },

  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "tested_by",
  //         foreignField: "_id",
  //         as: "analyst",
  //       },
  //     },
  //   ];

  //   // Add search filter
  //   if (search) {
  //     pipeline.push({
  //       $match: {
  //         $or: [
  //           { "sample.sample_id": { $regex: search, $options: "i" } },
  //           { parameter: { $regex: search, $options: "i" } },
  //           { method_id: { $regex: search, $options: "i" } },
  //         ],
  //       },
  //     });
  //   }

  //   // Add projection
  //   pipeline.push({
  //     $project: {
  //       sampleId: "$sample.sample_id",
  //       testName: "$parameter",
  //       method: "$method_id",
  //       result: {
  //         $cond: [
  //           { $eq: [{ $type: "$value" }, "number"] },
  //           {
  //             $concat: [
  //               { $toString: "$value" },
  //               " ",
  //               { $ifNull: ["$unit", ""] },
  //             ],
  //           },
  //           { $toString: "$value" },
  //         ],
  //       },
  //       lowerSpec: { $ifNull: ["$lower_spec", "N/A"] },
  //       upperSpec: { $ifNull: ["$upper_spec", "N/A"] },
  //       status: "$result",
  //       analyst: {
  //         $ifNull: [{ $arrayElemAt: ["$analyst.name", 0] }, "Unknown"],
  //       },
  //       date: {
  //         $dateToString: {
  //           format: "%Y-%m-%d",
  //           date: "$tested_at",
  //         },
  //       },
  //       tested_at: "$tested_at",
  //       // For color coding in UI
  //       statusColor: {
  //         $switch: {
  //           branches: [
  //             { case: { $eq: ["$result", "Pass"] }, then: "green" },
  //             { case: { $eq: ["$result", "Fail"] }, then: "red" },
  //             {
  //               case: { $in: ["$result", ["Pending", "In-Progress"]] },
  //               then: "yellow",
  //             },
  //           ],
  //           default: "gray",
  //         },
  //       },
  //     },
  //   });

  //   // Get total count for pagination
  //   const totalCountPipeline = [...pipeline];
  //   totalCountPipeline.push({ $count: "total" });
  //   const [totalCountResult] = await TestResultModel.aggregate(
  //     totalCountPipeline
  //   );
  //   const totalCount = totalCountResult?.total || 0;

  //   // Add sorting and pagination
  //   pipeline.push({ $sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } });
  //   pipeline.push({ $skip: (page - 1) * limit });
  //   pipeline.push({ $limit: limit });

  //   const results = await TestResultModel.aggregate(pipeline);

  //   return {
  //     results,
  //     totalCount,
  //     pagination: {
  //       currentPage: page,
  //       totalPages: Math.ceil(totalCount / limit),
  //       totalRecords: totalCount,
  //       hasNext: page < Math.ceil(totalCount / limit),
  //       hasPrev: page > 1,
  //       limit,
  //     },
  //   };
  // }
  async samplesOverview(req, res) {
    try {
      // Find all samples and populate the necessary fields from other collections.
      const samples = await SampleModel.find({})
        .populate({
          path: "batch",
          // ADDED plant_location to the select fields.
          select: "api_batch_id project customer plant_location",
          populate: [
            {
              path: "project",
              select: "project_name",
            },
            {
              path: "customer",
              select: "name",
            },
          ],
        })
        .populate({
          path: "collected_by",
          select: "name",
        })
        .populate({
          path: "test_results", // Populate all test results for detailed display
        });

      // Calculate stats for the stats object
      const totalSamplesCount = samples.length;
      let pendingTestingCount = 0;
      let inProgressCount = 0;
      let acceptedCount = 0;
      let failedTestsCount = 0;

      samples.forEach((sample) => {
        const totalTests = sample.test_results.length;
        const passedTests = sample.test_results.filter(
          (test) => test.status === "Passed"
        ).length;
        const failedTests = sample.test_results.filter(
          (test) => test.status === "Failed"
        ).length;

        if (totalTests === 0) {
          pendingTestingCount++;
        } else if (passedTests === totalTests) {
          acceptedCount++;
        } else if (failedTests > 0) {
          failedTestsCount++;
        } else {
          inProgressCount++;
        }
      });

      const stats = {
        totalSamplesCount,
        pendingTestingCount,
        inProgressCount,
        acceptedCount,
        failedTestsCount,
      };

      // Format the data to match the desired response structure
      const formattedSamples = samples.map((sample) => {
        const batchApiId = sample.batch ? sample.batch.api_batch_id : "N/A";
        const projectName =
          sample.batch && sample.batch.project
            ? sample.batch.project.project_name
            : "N/A";
        const customerName =
          sample.batch && sample.batch.customer
            ? sample.batch.customer.name
            : "N/A";

        // Calculate Test Progress
        const totalTests = sample.test_results.length;
        const passedTests = sample.test_results.filter(
          (test) => test.status === "Passed"
        ).length;
        const testProgress =
          totalTests > 0
            ? `${passedTests}/${totalTests} passed`
            : "No tests run";

        // Logic for "Analyst" and "Pulled" date (from collected_by and collected_at)
        const analystName = sample.collected_by
          ? sample.collected_by.name
          : "N/A";
        const pulledDate = sample.collected_at
          ? new Date(sample.collected_at).toISOString().split("T")[0]
          : "N/A";

        // Get the plant location from the batch.
        const plantLocation = sample.batch
          ? sample.batch.plant_location
          : "N/A";

        // Use priority and disposition directly from the sample model.
        // Assuming these fields exist in the Sample schema.
        const priority = sample.priority || "N/A";
        const disposition = sample.disposition || "N/A";

        // Format the detailed test results for this sample
        const detailedTests = sample.test_results.map((testResult) => ({
          _id: testResult._id,
          testId: testResult.test_id || "N/A",
          testName: testResult.parameter || "N/A", // Using 'parameter' as Test Name
          testMethod: testResult.method_id || "N/A", // Using 'method_id' as Test Method
          resultValue: testResult.value || "N/A",
          resultUnit: testResult.unit || "N/A",
          resultStatus: testResult.status || "N/A", // Correctly using 'status' field
          specificationRange: "N/A", // Not directly in schema, placeholder
          testTimestamp: testResult.tested_at
            ? new Date(testResult.tested_at).toISOString().split("T")[0]
            : "N/A",
          analystId: testResult.tested_by ? testResult.tested_by.name : "N/A", // Assuming tested_by is User ObjectId
          approvalStatus: "N/A", // Not directly in schema, placeholder
        }));

        return {
          _id: sample._id, // Sample object ID
          batch_id: sample.batch._id, // Batch object ID
          sample_id: sample.sample_id,
          api_batch_id: batchApiId,
          type_and_status: sample.sample_type,
          project_and_customer: {
            product_name: projectName,
            customer_name: customerName,
            project_id: sample.batch.project,
          },
          // Now using the correct plant_location from the batch.
          sub_process_and_location: plantLocation,
          test_progress: testProgress,
          analyst: {
            name: analystName,
            pulled_date: pulledDate,
            by: analystName,
          },
          priority: priority,
          disposition: disposition,
          storage_location: sample.storage_location, // Kept this in case it's a separate field
          actions: {
            view_details: `/api/samples/${sample._id}`,
            export_report: `/api/samples/${sample._id}/report`,
          },
          tests: detailedTests, // Include the detailed test results here
        };
      });

      res.status(200).json({
        count: formattedSamples.length,
        samples: formattedSamples,
        stats,
      });
    } catch (error) {
      console.error("Error fetching samples overview:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  // async getBatchSamplesTests(req, res) {
  //   try {
  //     const { batchId } = req.params;
  //     const {
  //       page = 1,
  //       limit = 10,
  //       status = "",
  //       search = "",
  //       sortBy = "tested_at",
  //       sortOrder = "desc",
  //     } = req.query;

  //     // Validate batch exists
  //     const batch = await BatchModel.findById(batchId)
  //       .populate("customer", "name")
  //       .populate("project", "project_name");

  //     if (!batch) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Batch not found",
  //       });
  //     }

  //     // Get sample overview KPIs
  //     const sampleOverview = await this._getSampleOverviewData(batchId);

  //     // Get test results with filtering
  //     const testResults = await this._getTestResultsData(batchId, {
  //       page: parseInt(page),
  //       limit: parseInt(limit),
  //       status,
  //       search,
  //       sortBy,
  //       sortOrder,
  //     });

  //     // Audit log
  //     console.log(
  //       `📊 Samples & Tests accessed - Batch: ${batchId}, User: ${
  //         req.headers["user-id"] || "anonymous"
  //       }`
  //     );

  //     res.json({
  //       success: true,
  //       data: {
  //         batch: {
  //           _id: batch._id,
  //           api_batch_id: batch.api_batch_id,
  //           status: batch.status,
  //           customer: batch.customer?.name || "Unknown Customer",
  //           project: batch.project?.project_name || "Unknown Project",
  //         },
  //         sampleOverview,
  //         testResults: testResults.results,
  //         pagination: testResults.pagination,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("❌ Error fetching samples & tests:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //       error: error.message,
  //     });
  //   }
  // }

  // ================================
  // GET SAMPLE OVERVIEW KPIs
  // Route: GET /api/batches/:batchId/samples-overview
  // Purpose: Get sample overview panel metrics
  // ================================

  // async getSampleOverview(req, res) {
  //   try {
  //     const { batchId } = req.params;

  //     const overviewData = await this._getSampleOverviewData(batchId);

  //     res.json({
  //       success: true,
  //       data: overviewData,
  //     });
  //   } catch (error) {
  //     console.error("❌ Error fetching sample overview:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //       error: error.message,
  //     });
  //   }
  // }

  // ================================
  // GET TEST RESULTS TABLE
  // Route: GET /api/batches/:batchId/test-results
  // Purpose: Get paginated test results table
  // ================================

  async getTestResults(req, res) {
    try {
      const { batchId } = req.params;
      const {
        page = 1,
        limit = 10,
        status = "",
        search = "",
        sortBy = "tested_at",
        sortOrder = "desc",
      } = req.query;

      const testResults = await this._getTestResultsData(batchId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
        sortBy,
        sortOrder,
      });

      res.json({
        success: true,
        data: {
          testResults: testResults.results,
          pagination: testResults.pagination,
          totalCount: testResults.totalCount,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching test results:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // SEARCH TEST RESULTS
  // Route: GET /api/batches/:batchId/test-results/search
  // Purpose: Advanced search and filtering
  // ================================

  async searchTestResults(req, res) {
    try {
      const { batchId } = req.params;
      const {
        query = "",
        status = "",
        testName = "",
        method = "",
        analyst = "",
        dateFrom = "",
        dateTo = "",
        resultType = "", // pass, fail, pending
      } = req.query;

      // Build search filters
      const searchFilter = { batch: new mongoose.Types.ObjectId(batchId) };

      if (query) {
        searchFilter.$or = [
          { "sample.sample_id": { $regex: query, $options: "i" } },
          { parameter: { $regex: query, $options: "i" } },
          { method_id: { $regex: query, $options: "i" } },
        ];
      }

      if (status) searchFilter.result = status;
      if (testName)
        searchFilter.parameter = { $regex: testName, $options: "i" };
      if (method) searchFilter.method_id = { $regex: method, $options: "i" };
      if (resultType) searchFilter.result = resultType;

      if (dateFrom || dateTo) {
        searchFilter.tested_at = {};
        if (dateFrom) searchFilter.tested_at.$gte = new Date(dateFrom);
        if (dateTo) searchFilter.tested_at.$lte = new Date(dateTo);
      }

      const searchResults = await TestResultModel.aggregate([
        {
          $lookup: {
            from: "samples",
            localField: "sample",
            foreignField: "_id",
            as: "sample",
          },
        },
        { $unwind: "$sample" },

        { $match: searchFilter },

        {
          $lookup: {
            from: "users",
            localField: "tested_by",
            foreignField: "_id",
            as: "analyst",
          },
        },

        {
          $project: {
            sampleId: "$sample.sample_id",
            testName: "$parameter",
            method: "$method_id",
            result: {
              $cond: [
                { $eq: [{ $type: "$value" }, "number"] },
                {
                  $concat: [
                    { $toString: "$value" },
                    " ",
                    { $ifNull: ["$unit", ""] },
                  ],
                },
                { $toString: "$value" },
              ],
            },
            lowerSpec: { $ifNull: ["$lower_spec", "N/A"] },
            upperSpec: { $ifNull: ["$upper_spec", "N/A"] },
            status: "$result",
            analyst: {
              $ifNull: [{ $arrayElemAt: ["$analyst.name", 0] }, "Unknown"],
            },
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$tested_at",
              },
            },
            tested_at: "$tested_at",
          },
        },

        { $sort: { tested_at: -1 } },
      ]);

      // Filter by analyst if specified
      let filteredResults = searchResults;
      if (analyst) {
        filteredResults = searchResults.filter((result) =>
          result.analyst.toLowerCase().includes(analyst.toLowerCase())
        );
      }

      res.json({
        success: true,
        data: {
          searchResults: filteredResults,
          totalFound: filteredResults.length,
          searchCriteria: {
            query,
            status,
            testName,
            method,
            analyst,
            dateFrom,
            dateTo,
            resultType,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error searching test results:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // EXPORT TEST RESULTS
  // Route: GET /api/batches/:batchId/test-results/export
  // Purpose: Export test results in CSV/PDF format
  // ================================

  async exportTestResults(req, res) {
    try {
      const { batchId } = req.params;
      const { format = "csv", status = "" } = req.query;

      // Get batch info
      const batch = await BatchModel.findById(batchId)
        .populate("customer", "name")
        .populate("project", "project_name");

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Get all test results for export
      const exportData = await TestResultModel.aggregate([
        {
          $lookup: {
            from: "samples",
            localField: "sample",
            foreignField: "_id",
            as: "sample",
          },
        },
        { $unwind: "$sample" },

        {
          $match: {
            "sample.batch": new mongoose.Types.ObjectId(batchId),
            ...(status && { result: status }),
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "tested_by",
            foreignField: "_id",
            as: "analyst",
          },
        },

        {
          $project: {
            "Sample ID": "$sample.sample_id",
            "Test Name": "$parameter",
            Method: "$method_id",
            Result: {
              $cond: [
                { $eq: [{ $type: "$value" }, "number"] },
                {
                  $concat: [
                    { $toString: "$value" },
                    " ",
                    { $ifNull: ["$unit", ""] },
                  ],
                },
                { $toString: "$value" },
              ],
            },
            "Lower Spec": { $ifNull: ["$lower_spec", "N/A"] },
            "Upper Spec": { $ifNull: ["$upper_spec", "N/A"] },
            Status: "$result",
            Analyst: {
              $ifNull: [{ $arrayElemAt: ["$analyst.name", 0] }, "Unknown"],
            },
            Date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$tested_at",
              },
            },
            Remarks: { $ifNull: ["$remarks", ""] },
          },
        },

        { $sort: { Date: -1 } },
      ]);

      // Calculate summary statistics
      const summary = {
        batchId: batch.api_batch_id,
        customer: batch.customer?.name || "Unknown",
        project: batch.project?.project_name || "Unknown",
        exportDate: new Date().toISOString().split("T")[0],
        totalTests: exportData.length,
        passedTests: exportData.filter((test) => test.Status === "Pass").length,
        failedTests: exportData.filter((test) => test.Status === "Fail").length,
        pendingTests: exportData.filter((test) => test.Status === "Pending")
          .length,
      };

      // Audit log
      console.log(
        `📤 Test results exported - Batch: ${batchId}, Format: ${format}, User: ${
          req.headers["user-id"] || "anonymous"
        }`
      );

      res.json({
        success: true,
        data: {
          summary,
          testResults: exportData,
          format,
          exportMetadata: {
            generatedAt: new Date(),
            totalRecords: exportData.length,
            filters: { status },
          },
        },
      });
    } catch (error) {
      console.error("❌ Error exporting test results:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET SAMPLE DETAILED TESTS
  // Route: GET /api/samples/:sampleId/detailed-tests
  // Purpose: Get detailed test information for a specific sample
  // ================================

  async getSampleDetailedTests(req, res) {
    try {
      const { sampleId } = req.params;

      const sampleDetails = await SampleModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(sampleId) } },

        {
          $lookup: {
            from: "testresults",
            localField: "_id",
            foreignField: "sample",
            as: "testResults",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "tested_by",
                  foreignField: "_id",
                  as: "analyst",
                },
              },
              {
                $project: {
                  test_id: 1,
                  parameter: 1,
                  method_id: 1,
                  value: 1,
                  unit: 1,
                  result: 1,
                  tested_at: 1,
                  equipment_used: 1,
                  reagents: 1,
                  remarks: 1,
                  lower_spec: 1,
                  upper_spec: 1,
                  analyst: { $arrayElemAt: ["$analyst.name", 0] },
                },
              },
              { $sort: { tested_at: -1 } },
            ],
          },
        },

        {
          $lookup: {
            from: "batches",
            localField: "batch",
            foreignField: "_id",
            as: "batch",
          },
        },
        { $unwind: "$batch" },

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
            batch: {
              api_batch_id: 1,
              status: 1,
            },
            collectedBy: { $arrayElemAt: ["$collectedBy.name", 0] },
            testResults: 1,
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
      console.error("❌ Error fetching sample detailed tests:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET TEST STATISTICS
  // Route: GET /api/batches/:batchId/test-statistics
  // Purpose: Get comprehensive test statistics and trends
  // ================================

  async getTestStatistics(req, res) {
    try {
      const { batchId } = req.params;

      const statistics = await TestResultModel.aggregate([
        {
          $lookup: {
            from: "samples",
            localField: "sample",
            foreignField: "_id",
            as: "sample",
          },
        },
        { $unwind: "$sample" },

        {
          $match: {
            "sample.batch": new mongoose.Types.ObjectId(batchId),
          },
        },

        {
          $group: {
            _id: null,
            totalTests: { $sum: 1 },
            passedTests: {
              $sum: { $cond: [{ $eq: ["$result", "Pass"] }, 1, 0] },
            },
            failedTests: {
              $sum: { $cond: [{ $eq: ["$result", "Fail"] }, 1, 0] },
            },
            pendingTests: {
              $sum: {
                $cond: [{ $in: ["$result", ["Pending", "In-Progress"]] }, 1, 0],
              },
            },
            // Test method breakdown
            methodBreakdown: {
              $push: "$method_id",
            },
            // Parameter breakdown
            parameterBreakdown: {
              $push: "$parameter",
            },
            // Daily test trend
            dailyTests: {
              $push: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$tested_at",
                  },
                },
                result: "$result",
              },
            },
          },
        },

        {
          $project: {
            totalTests: 1,
            passedTests: 1,
            failedTests: 1,
            pendingTests: 1,
            passRate: {
              $multiply: [{ $divide: ["$passedTests", "$totalTests"] }, 100],
            },
            failRate: {
              $multiply: [{ $divide: ["$failedTests", "$totalTests"] }, 100],
            },
            pendingRate: {
              $multiply: [{ $divide: ["$pendingTests", "$totalTests"] }, 100],
            },
            methodBreakdown: 1,
            parameterBreakdown: 1,
            dailyTests: 1,
          },
        },
      ]);

      const stats = statistics[0] || {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        pendingTests: 0,
        passRate: 0,
        failRate: 0,
        pendingRate: 0,
        methodBreakdown: [],
        parameterBreakdown: [],
        dailyTests: [],
      };

      // Process method and parameter breakdowns
      const methodCounts = {};
      stats.methodBreakdown?.forEach((method) => {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      const parameterCounts = {};
      stats.parameterBreakdown?.forEach((param) => {
        parameterCounts[param] = (parameterCounts[param] || 0) + 1;
      });

      // Process daily trend
      const dailyTrend = {};
      stats.dailyTests?.forEach((test) => {
        if (!dailyTrend[test.date]) {
          dailyTrend[test.date] = { total: 0, pass: 0, fail: 0, pending: 0 };
        }
        dailyTrend[test.date].total++;
        if (test.result === "Pass") dailyTrend[test.date].pass++;
        else if (test.result === "Fail") dailyTrend[test.date].fail++;
        else dailyTrend[test.date].pending++;
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalTests: stats.totalTests,
            passedTests: stats.passedTests,
            failedTests: stats.failedTests,
            pendingTests: stats.pendingTests,
            passRate: Math.round(stats.passRate || 0),
            failRate: Math.round(stats.failRate || 0),
            pendingRate: Math.round(stats.pendingRate || 0),
          },
          methodBreakdown: Object.entries(methodCounts).map(
            ([method, count]) => ({
              method,
              count,
              percentage: Math.round((count / stats.totalTests) * 100),
            })
          ),
          parameterBreakdown: Object.entries(parameterCounts).map(
            ([parameter, count]) => ({
              parameter,
              count,
              percentage: Math.round((count / stats.totalTests) * 100),
            })
          ),
          dailyTrend: Object.entries(dailyTrend)
            .map(([date, data]) => ({
              date,
              ...data,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching test statistics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  async getLimsSample(req, res) {
    try {
      const { batchId } = req.params;

      // A robust check to ensure the batchId is a valid ObjectId,
      // preventing malformed queries and potential server errors.
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID format",
        });
      }

      // A placeholder value, since the total number of samples required is not
      // available from the provided schemas. This value is based on the UI example.
      const totalSamplesNeeded = 6;

      // Use an aggregation pipeline to fetch all required data efficiently in one go.
      const samples = await SampleModel.aggregate([
        // Stage 1: Match samples to the provided batchId.
        // The `$or` operator handles potential data type mismatches (string vs. ObjectId).
        {
          $match: {
            $or: [
              { batch: new mongoose.Types.ObjectId(batchId) },
              { batch: batchId },
            ],
          },
        },

        // Stage 2: Look up the user who collected the sample.
        {
          $lookup: {
            from: "users",
            localField: "collected_by",
            foreignField: "_id",
            as: "collectedByDetails",
          },
        },
        // Unwind the user details to get a single document.
        {
          $unwind: {
            path: "$collectedByDetails",
            preserveNullAndEmptyArrays: true, // Keep samples even if no user is found
          },
        },

        // Stage 3: Look up all test results for each sample.
        {
          $lookup: {
            from: "testresults",
            localField: "test_results",
            foreignField: "_id",
            as: "testResults",
          },
        },

        // Stage 4: Look up deviations linked to the samples.
        // This is a nested pipeline to ensure an accurate match.
        {
          $lookup: {
            from: "deviations",
            let: { sampleId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$linked_entity.entity_type", "Sample"] },
                      // Convert sampleId to a string for comparison, as per the schema
                      {
                        $eq: [
                          "$linked_entity.entity_id",
                          { $toString: "$$sampleId" },
                        ],
                      },
                    ],
                  },
                },
              },
              // We only need the _id to check for existence, so project accordingly.
              {
                $project: { _id: 1 },
              },
            ],
            as: "deviations",
          },
        },

        // Stage 5: Add a new field to indicate if a deviation exists.
        {
          $addFields: {
            hasDeviation: { $gt: [{ $size: "$deviations" }, 0] },
          },
        },

        // Stage 6: Project the final document shape.
        {
          $project: {
            _id: 1,
            sample_id: 1,
            collected_at: 1, // Include the collection date
            collectedByDetails: 1, // Include the user details
            testResults: 1,
            hasDeviation: 1,
          },
        },
      ]);

      // Calculate the summary statistics for the dashboard.
      const samplesTaken = samples.length;
      const samplesWithDeviations = samples.filter(
        (s) => s.hasDeviation
      ).length;
      const completionPercentage =
        totalSamplesNeeded > 0
          ? Math.round((samplesTaken / totalSamplesNeeded) * 100)
          : 0;

      const stats = {
        totalSamplesNeeded,
        samplesTaken,
        completion: `${completionPercentage}%`,
        samplesWithDeviations,
      };

      // Flatten the test results into a single array for the table display.
      const testResultsTable = [];
      samples.forEach((sample) => {
        // Extract and format the user and date data, with "N/A" as a fallback.
        const analystName = sample.collectedByDetails?.name || "N/A";
        const collectedDate = sample.collected_at
          ? new Date(sample.collected_at).toLocaleDateString()
          : "N/A";

        sample.testResults.forEach((result) => {
          // Determine the boolean status based on the result.status string.
          const isPassing = result.status === "Passed";

          testResultsTable.push({
            // Add ObjectId for both the test result and the parent sample.
            _id: result._id || "N/A",
            sampleId: sample.sample_id || "N/A",
            // The user requested testName to be the same as method.
            testName: result.parameter || "N/A",
            // Use the `parameter` field for the method.
            method: result.parameter || "N/A",
            // Now include the requested test_id and method_id
            test_id: result.test_id || "N/A",
            method_id: result.method_id || "N/A",
            result: result.result || "N/A",
            lowerSpec: result.lower_spec || "N/A",
            upperSpec: result.upper_spec || "N/A",
            status: isPassing, // Now a boolean value
            analyst: analystName, // Use the new analystName from the user model
            date: collectedDate, // Use the new collectedDate
          });
        });
      });

      // Send the final, well-structured JSON response.
      res.json({
        success: true,
        data: {
          batchId,
          stats,
          testResults: testResultsTable,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching samples and LIMS data:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export default new SamplesTestsController();
