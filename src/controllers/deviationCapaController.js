// ================================
// 2. controllers/deviationCapaController.js
// ================================

import mongoose from "mongoose";
import { BatchModel } from "../models/batchModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { ProjectModel } from "../models/projectModel.js";
class DeviationCapaController {
  // ================================
  // GET BATCH DEVIATIONS & CAPA OVERVIEW
  // Route: GET /api/batches/:batchId/deviations-capa
  // Purpose: Main endpoint combining summary KPIs and deviation mapping table
  // ================================
  async deviationsOverview(req, res) {
    try {
      // Find all deviations and populate the necessary fields from other collections.
      const deviations = await DeviationModel.find({})
        .populate({
          path: "batch",
          select: "api_batch_id project customer", // Select project and customer from the Batch model
          populate: [
            {
              path: "project",
              select: "project_name", // Populate the project's name
            },
            {
              path: "customer",
              select: "name", // Populate the customer's name
            },
          ],
        })
        .populate({
          path: "raised_by",
          select: "name",
        })
        .populate({
          path: "resolution.closed_by",
          select: "name",
        });

      // The previous manual population of project and customer is no longer needed.
      // The main query now handles this efficiently.

      // Calculate stats for the stats object
      const totalDeviationsCount = deviations.length;
      const openDeviationsCount = deviations.filter(
        (d) => d.status === "Open"
      ).length;
      const criticalDeviationsCount = deviations.filter(
        (d) => d.severity === "Critical"
      ).length;
      const investigatingCount = 0; // This requires a new status or field in your schema. Placeholder.

      // Calculate average age in days
      let totalAgeInDays = 0;
      deviations.forEach((d) => {
        const raisedDate = d.raised_at;
        if (raisedDate) {
          const diffInMs = new Date() - raisedDate;
          totalAgeInDays += diffInMs / (1000 * 60 * 60 * 24);
        }
      });
      const averageAgeInDays =
        totalDeviationsCount > 0
          ? (totalAgeInDays / totalDeviationsCount).toFixed(2)
          : 0;

      const stats = {
        totalDeviationsCount,
        openDeviationsCount,
        criticalDeviationsCount,
        investigatingCount,
        averageAgeInDays,
      };

      // Format the data to match the desired response structure, including the deviation and batch IDs
      const formattedDeviations = deviations.map((deviation) => {
        // Logic to determine "Assigned To". Your schema doesn't have a direct field,
        // so we'll use a placeholder or assume it's the `raised_by` user for now.
        const assignedTo = deviation.raised_by
          ? deviation.raised_by.name
          : "N/A";

        // Logic to get the sub-process. This is not directly in the schema,
        // so it will be a placeholder for now.
        const subProcess = "N/A";

        // Logic for "Age". We'll calculate it from `raised_at`
        const ageInDays = deviation.raised_at
          ? Math.floor(
              (new Date() - deviation.raised_at) / (1000 * 60 * 60 * 24)
            )
          : "N/A";

        // Logic for "Priority". This is not in the schema, so we'll map severity.
        let priority;
        switch (deviation.severity) {
          case "Critical":
            priority = "Urgent";
            break;
          case "Major":
            priority = "High";
            break;
          case "Minor":
            priority = "Low";
            break;
          default:
            priority = "N/A";
        }

        return {
          _id: deviation._id, // Deviation object ID
          deviation_no: deviation.deviation_no,
          batch_id: deviation.batch._id, // Batch object ID
          api_batch_id: deviation.batch.api_batch_id,
          title: deviation.title,
          description: deviation.description,
          project_name:
            deviation.batch && deviation.batch.project
              ? deviation.batch.project.project_name
              : "N/A",
          customer_name:
            deviation.batch && deviation.batch.customer
              ? deviation.batch.customer.name
              : "N/A",
          sub_process: subProcess,
          severity: deviation.severity,
          status: deviation.status,
          priority: priority,
          age: ageInDays,
          raised_by: assignedTo, // Assuming raised_by is the assigned user
          raised_at: deviation.raised_at,
          actions: {
            view_details: `/api/deviations/${deviation._id}`,
          },
        };
      });

      res.status(200).json({
        count: formattedDeviations.length,
        deviations: formattedDeviations,
        stats,
      });
    } catch (error) {
      console.error("Error fetching deviation overview:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
  async getCapaDeviations(req, res) {
    try {
      // Return a summary of all deviations with stats
      const allDeviations = await DeviationModel.find({})
        .populate({
          path: "batch",
          select: "api_batch_id",
        })
        .populate({
          path: "raised_by",
          select: "name",
        })
        .populate({
          path: "resolution.linked_capa",
          select: "_id", // Just to check if a CAPA exists
        });

      // Calculate stats
      const totalDeviations = allDeviations.length;
      const criticalOpen = allDeviations.filter(
        (d) => d.severity === "Critical" && d.status === "Open"
      ).length;
      const majorOpen = allDeviations.filter(
        (d) => d.severity === "Major" && d.status === "Open"
      ).length;
      const capaCount = allDeviations.filter(
        (d) => d.resolution.linked_capa
      ).length;

      let totalAgeInDays = 0;
      allDeviations.forEach((d) => {
        if (d.raised_at) {
          const diffInMs = new Date() - d.raised_at;
          totalAgeInDays += diffInMs / (1000 * 60 * 60 * 24);
        }
      });
      const avgAgeInDays =
        totalDeviations > 0 ? (totalAgeInDays / totalDeviations).toFixed(2) : 0;

      const stats = {
        totalDeviations,
        criticalOpen,
        majorOpen,
        capaCount,
        avgAgeInDays,
      };

      // Format the overview data to match the image
      const formattedDeviations = allDeviations.map((deviation) => ({
        _id: deviation._id,
        deviation_no: deviation.deviation_no,
        severity: deviation.severity,
        status: deviation.status,
        type: deviation.linked_entity
          ? deviation.linked_entity.entity_type
          : "N/A", // Assuming type from linked_entity
        title: deviation.title,
        description: deviation.description,
        capa_status: deviation.resolution.linked_capa ? "Linked" : "N/A",
        reported_by: deviation.raised_by ? deviation.raised_by.name : "N/A",
        date: deviation.raised_at
          ? deviation.raised_at.toISOString().split("T")[0]
          : "N/A",
        age_in_days: deviation.raised_at
          ? Math.floor(
              (new Date() - deviation.raised_at) / (1000 * 60 * 60 * 24)
            )
          : "N/A",
        actions: {
          view_details: `/api/deviations/${deviation.deviation_no}`,
        },
      }));

      return res.status(200).json({
        stats,
        deviations: formattedDeviations,
      });
    } catch (error) {
      console.error("Error fetching deviation overview data:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
  async getCapaDeviationDetails(req, res) {
    try {
      const { deviationNo } = req.params;

      // Fetch a single deviation with all details
      const deviation = await DeviationModel.findOne({
        deviation_no: deviationNo,
      })
        .populate({
          path: "batch",
          select: "api_batch_id project customer",
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
          path: "raised_by",
          select: "name role",
        })
        .populate({
          path: "resolution.closed_by",
          select: "name",
        })
        .populate({
          path: "resolution.linked_capa",
          select: "status",
        })
        .populate({
          path: "linked_entity.batch linked_entity.sample linked_entity.test_result linked_entity.process_step linked_entity.equipment",
        });

      if (!deviation) {
        return res.status(404).json({ message: "Deviation not found" });
      }

      // Format the single deviation response
      const result = {
        _id: deviation._id,
        deviation_no: deviation.deviation_no,
        title: deviation.title,
        description: deviation.description,
        batch_id: deviation.batch ? deviation.batch._id : "N/A",
        api_batch_id: deviation.batch ? deviation.batch.api_batch_id : "N/A",
        severity: deviation.severity,
        status: deviation.status,
        reported_by: deviation.raised_by ? deviation.raised_by.name : "N/A",
        reported_by_role: deviation.raised_by
          ? deviation.raised_by.role
          : "N/A",
        date: deviation.raised_at,
        age_in_days: deviation.raised_at
          ? Math.floor(
              (new Date() - deviation.raised_at) / (1000 * 60 * 60 * 24)
            )
          : "N/A",
        linked_capa: deviation.resolution.linked_capa
          ? deviation.resolution.linked_capa.status
          : "N/A",
        actions: {
          view_details: `/api/deviations/${deviation._id}`,
        },
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching single deviation data:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getBatchDeviationsCapa(req, res) {
    try {
      const { batchId } = req.params;
      const {
        page = 1,
        limit = 10,
        status = "",
        severity = "",
        search = "",
        sortBy = "raised_at",
        sortOrder = "desc",
        onlyOpen = "false",
      } = req.query;

      // Validate batch exists
      const batch = await BatchModel.findById(batchId)
        .populate("customer", "name")
        .populate("project", "project_name");

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // Get deviation summary KPIs
      const deviationSummary = await this._getDeviationSummaryData(batchId);

      // Get deviations table with filtering
      const deviationsTable = await this._getDeviationsTableData(batchId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        severity,
        search,
        sortBy,
        sortOrder,
        onlyOpen: onlyOpen === "true",
      });

      // Audit log
      console.log(
        `📋 Deviations & CAPA accessed - Batch: ${batchId}, User: ${
          req.headers["user-id"] || "anonymous"
        }`
      );

      res.json({
        success: true,
        data: {
          batch: {
            _id: batch._id,
            api_batch_id: batch.api_batch_id,
            status: batch.status,
            customer: batch.customer?.name || "Unknown Customer",
            project: batch.project?.project_name || "Unknown Project",
          },
          deviationSummary,
          deviationsTable: deviationsTable.results,
          pagination: deviationsTable.pagination,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching deviations & CAPA:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET DEVIATION SUMMARY KPIs
  // Route: GET /api/batches/:batchId/deviations-summary
  // Purpose: Get deviation summary panel metrics
  // ================================

  async getDeviationSummary(req, res) {
    try {
      const { batchId } = req.params;

      const summaryData = await this._getDeviationSummaryData(batchId);

      res.json({
        success: true,
        data: summaryData,
      });
    } catch (error) {
      console.error("❌ Error fetching deviation summary:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET DEVIATIONS TABLE
  // Route: GET /api/batches/:batchId/deviations-table
  // Purpose: Get paginated deviations mapping table
  // ================================

  async getDeviationsTable(req, res) {
    try {
      const { batchId } = req.params;
      const {
        page = 1,
        limit = 10,
        status = "",
        severity = "",
        search = "",
        sortBy = "raised_at",
        sortOrder = "desc",
        onlyOpen = "false",
      } = req.query;

      const deviationsTable = await this._getDeviationsTableData(batchId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        severity,
        search,
        sortBy,
        sortOrder,
        onlyOpen: onlyOpen === "true",
      });

      res.json({
        success: true,
        data: {
          deviations: deviationsTable.results,
          pagination: deviationsTable.pagination,
          totalCount: deviationsTable.totalCount,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching deviations table:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // SEARCH DEVIATIONS
  // Route: GET /api/batches/:batchId/deviations/search
  // Purpose: Advanced search and filtering
  // ================================

  async searchDeviations(req, res) {
    try {
      const { batchId } = req.params;
      const {
        query = "",
        status = "",
        severity = "",
        deviationType = "",
        sourceSystem = "",
        reportedBy = "",
        dateFrom = "",
        dateTo = "",
        hasCapa = "",
        linkedEntity = "", // sample_id, test_id, process_stage, equipment_id
      } = req.query;

      // Build search filters
      const searchFilter = { batch: new mongoose.Types.ObjectId(batchId) };

      if (query) {
        searchFilter.$or = [
          { deviation_no: { $regex: query, $options: "i" } },
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ];
      }

      if (status) searchFilter.status = status;
      if (severity) searchFilter.severity = severity;
      if (deviationType) searchFilter.deviation_type = deviationType;
      if (sourceSystem) searchFilter.source_system = sourceSystem;

      if (dateFrom || dateTo) {
        searchFilter.raised_at = {};
        if (dateFrom) searchFilter.raised_at.$gte = new Date(dateFrom);
        if (dateTo) searchFilter.raised_at.$lte = new Date(dateTo);
      }

      if (hasCapa === "true") {
        searchFilter["resolution.linked_capa"] = { $exists: true, $ne: null };
      } else if (hasCapa === "false") {
        searchFilter["resolution.linked_capa"] = { $exists: false };
      }

      const searchResults = await DeviationModel.aggregate([
        { $match: searchFilter },

        // Lookup linked entities
        {
          $lookup: {
            from: "samples",
            localField: "linked_entity.sample",
            foreignField: "_id",
            as: "linkedSample",
          },
        },

        {
          $lookup: {
            from: "testresults",
            localField: "linked_entity.test_result",
            foreignField: "_id",
            as: "linkedTest",
          },
        },

        {
          $lookup: {
            from: "processsteps",
            localField: "linked_entity.process_step",
            foreignField: "_id",
            as: "linkedProcessStep",
          },
        },

        // Lookup users
        {
          $lookup: {
            from: "users",
            localField: "raised_by",
            foreignField: "_id",
            as: "reportedBy",
          },
        },

        // Lookup CAPA
        {
          $lookup: {
            from: "capas",
            localField: "resolution.linked_capa",
            foreignField: "_id",
            as: "linkedCapa",
          },
        },

        {
          $addFields: {
            linkedEntityFormatted: {
              $switch: {
                branches: [
                  {
                    case: { $gt: [{ $size: "$linkedSample" }, 0] },
                    then: {
                      type: "Sample",
                      id: { $arrayElemAt: ["$linkedSample.sample_id", 0] },
                      reference: { $arrayElemAt: ["$linkedSample._id", 0] },
                    },
                  },
                  {
                    case: { $gt: [{ $size: "$linkedTest" }, 0] },
                    then: {
                      type: "Test",
                      id: { $arrayElemAt: ["$linkedTest.test_id", 0] },
                      reference: { $arrayElemAt: ["$linkedTest._id", 0] },
                    },
                  },
                  {
                    case: { $gt: [{ $size: "$linkedProcessStep" }, 0] },
                    then: {
                      type: "Process Step",
                      id: { $arrayElemAt: ["$linkedProcessStep.step_name", 0] },
                      reference: {
                        $arrayElemAt: ["$linkedProcessStep._id", 0],
                      },
                    },
                  },
                ],
                default: {
                  type: "Equipment",
                  id: { $ifNull: ["$linked_entity.equipment", "N/A"] },
                  reference: "$linked_entity.equipment",
                },
              },
            },
            ageDays: {
              $divide: [
                { $subtract: [new Date(), "$raised_at"] },
                86400000, // milliseconds in a day
              ],
            },
          },
        },

        {
          $project: {
            deviation_no: 1,
            source_system: { $ifNull: ["$source_system", "LIMS"] },
            severity: 1,
            linkedEntity: "$linkedEntityFormatted",
            status: 1,
            deviation_type: { $ifNull: ["$deviation_type", "OOS"] },
            title: 1,
            description: 1,
            hasCapa: { $gt: [{ $size: "$linkedCapa" }, 0] },
            reportedBy: {
              $ifNull: [{ $arrayElemAt: ["$reportedBy.name", 0] }, "Unknown"],
            },
            raised_at: 1,
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$raised_at",
              },
            },
            ageDays: { $round: ["$ageDays", 0] },
          },
        },

        { $sort: { raised_at: -1 } },
      ]);

      // Apply additional filters
      let filteredResults = searchResults;

      if (reportedBy) {
        filteredResults = searchResults.filter((result) =>
          result.reportedBy.toLowerCase().includes(reportedBy.toLowerCase())
        );
      }

      if (linkedEntity) {
        filteredResults = filteredResults.filter((result) =>
          result.linkedEntity.id
            .toLowerCase()
            .includes(linkedEntity.toLowerCase())
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
            severity,
            deviationType,
            sourceSystem,
            reportedBy,
            dateFrom,
            dateTo,
            hasCapa,
            linkedEntity,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error searching deviations:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // GET DEVIATION DETAILS (READ-ONLY PANEL)
  // Route: GET /api/deviations/:deviationId/details
  // Purpose: Get complete deviation details for read-only panel
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
                $lookup: {
                  from: "customers",
                  localField: "customer",
                  foreignField: "_id",
                  as: "customer",
                },
              },
              {
                $lookup: {
                  from: "projects",
                  localField: "project",
                  foreignField: "_id",
                  as: "project",
                },
              },
              {
                $project: {
                  api_batch_id: 1,
                  status: 1,
                  customer: { $arrayElemAt: ["$customer.name", 0] },
                  project: { $arrayElemAt: ["$project.project_name", 0] },
                },
              },
            ],
          },
        },
        { $unwind: "$batch" },

        // Lookup linked entities with full details
        {
          $lookup: {
            from: "samples",
            localField: "linked_entity.sample",
            foreignField: "_id",
            as: "linkedSample",
            pipeline: [
              {
                $lookup: {
                  from: "testresults",
                  localField: "_id",
                  foreignField: "sample",
                  as: "testResults",
                },
              },
            ],
          },
        },

        {
          $lookup: {
            from: "testresults",
            localField: "linked_entity.test_result",
            foreignField: "_id",
            as: "linkedTest",
          },
        },

        {
          $lookup: {
            from: "processsteps",
            localField: "linked_entity.process_step",
            foreignField: "_id",
            as: "linkedProcessStep",
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

        // Lookup CAPA details
        {
          $lookup: {
            from: "capas",
            localField: "resolution.linked_capa",
            foreignField: "_id",
            as: "linkedCapa",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                },
              },
              {
                $project: {
                  title: 1,
                  description: 1,
                  status: 1,
                  opened_at: 1,
                  closed_at: 1,
                  owner: { $arrayElemAt: ["$owner.name", 0] },
                },
              },
            ],
          },
        },

        {
          $addFields: {
            ageDays: {
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
            linkedEntityDetails: {
              $cond: [
                { $gt: [{ $size: "$linkedSample" }, 0] },
                {
                  type: "Sample",
                  details: { $arrayElemAt: ["$linkedSample", 0] },
                },
                {
                  $cond: [
                    { $gt: [{ $size: "$linkedTest" }, 0] },
                    {
                      type: "Test",
                      details: { $arrayElemAt: ["$linkedTest", 0] },
                    },
                    {
                      $cond: [
                        { $gt: [{ $size: "$linkedProcessStep" }, 0] },
                        {
                          type: "Process Step",
                          details: { $arrayElemAt: ["$linkedProcessStep", 0] },
                        },
                        {
                          type: "Equipment",
                          details: { equipment_id: "$linked_entity.equipment" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },

        {
          $project: {
            // Basic deviation info
            deviation_no: 1,
            title: 1,
            description: 1,
            severity: 1,
            status: 1,
            deviation_type: { $ifNull: ["$deviation_type", "OOS"] },
            source_system: { $ifNull: ["$source_system", "LIMS"] },
            raised_at: 1,

            // Batch context
            batch: 1,

            // People involved
            raisedBy: {
              name: { $arrayElemAt: ["$raisedBy.name", 0] },
              role: { $arrayElemAt: ["$raisedBy.role", 0] },
            },
            closedBy: {
              name: { $arrayElemAt: ["$closedBy.name", 0] },
              role: { $arrayElemAt: ["$closedBy.role", 0] },
            },

            // Linked entity details
            linkedEntityDetails: 1,

            // Resolution details
            resolution: {
              action_taken: 1,
              closed_at: 1,
              effectiveness_check: {
                $ifNull: ["$resolution.effectiveness_check", "Pending"],
              },
            },

            // CAPA details
            linkedCapa: { $arrayElemAt: ["$linkedCapa", 0] },

            // Calculated fields
            ageDays: { $round: ["$ageDays", 1] },
            isOverdue: {
              $and: [
                { $in: ["$status", ["Open", "In-Progress"]] },
                { $gt: ["$ageDays", 30] }, // Consider overdue after 30 days
              ],
            },

            // Regulatory impact
            regulatoryImpact: {
              requiresReporting: {
                $cond: [{ $eq: ["$severity", "Critical"] }, true, false],
              },
              classification: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$severity", "Critical"] },
                      then: "Regulatory Reportable",
                    },
                    {
                      case: { $eq: ["$severity", "Major"] },
                      then: "QA Review Required",
                    },
                    {
                      case: { $eq: ["$severity", "Minor"] },
                      then: "Internal Investigation",
                    },
                  ],
                  default: "Under Review",
                },
              },
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

      // Audit log
      console.log(
        `🔍 Deviation details viewed - Deviation: ${deviationId}, User: ${
          req.headers["user-id"] || "anonymous"
        }`
      );

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
  // GET DEVIATION CAPA
  // Route: GET /api/deviations/:deviationId/capa
  // Purpose: Get CAPA details linked to a deviation
  // ================================

  async getDeviationCapa(req, res) {
    try {
      const { deviationId } = req.params;

      const capaDetails = await DeviationModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(deviationId) } },

        {
          $lookup: {
            from: "capas",
            localField: "resolution.linked_capa",
            foreignField: "_id",
            as: "capa",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                },
              },
              {
                $addFields: {
                  daysSinceOpened: {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ["$closed_at", new Date()] },
                          "$opened_at",
                        ],
                      },
                      86400000,
                    ],
                  },
                },
              },
              {
                $project: {
                  title: 1,
                  description: 1,
                  status: 1,
                  opened_at: 1,
                  closed_at: 1,
                  owner: {
                    name: { $arrayElemAt: ["$owner.name", 0] },
                    role: { $arrayElemAt: ["$owner.role", 0] },
                  },
                  daysSinceOpened: { $round: ["$daysSinceOpened", 0] },
                  isOverdue: {
                    $and: [
                      { $ne: ["$status", "Closed"] },
                      { $gt: ["$daysSinceOpened", 90] }, // CAPA overdue after 90 days
                    ],
                  },
                },
              },
            ],
          },
        },

        {
          $project: {
            deviation_no: 1,
            title: 1,
            severity: 1,
            capa: { $arrayElemAt: ["$capa", 0] },
            hasCapa: { $gt: [{ $size: "$capa" }, 0] },
          },
        },
      ]);

      if (!capaDetails.length) {
        return res.status(404).json({
          success: false,
          message: "Deviation not found",
        });
      }

      const result = capaDetails[0];
      if (!result.hasCapa) {
        return res.json({
          success: true,
          data: {
            deviation_no: result.deviation_no,
            title: result.title,
            severity: result.severity,
            capa: null,
            message: "No CAPA linked to this deviation",
          },
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching deviation CAPA:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ================================
  // EXPORT DEVIATIONS
  // Route: GET /api/batches/:batchId/deviations/export
  // Purpose: Export deviations data
  // ================================

  async exportDeviations(req, res) {
    try {
      const { batchId } = req.params;
      const { format = "csv", status = "", severity = "" } = req.query;

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

      // Build filter
      const matchFilter = {
        batch: new mongoose.Types.ObjectId(batchId),
      };

      if (status) matchFilter.status = status;
      if (severity) matchFilter.severity = severity;

      const exportData = await DeviationModel.aggregate([
        { $match: matchFilter },

        // Lookup linked entities
        {
          $lookup: {
            from: "samples",
            localField: "linked_entity.sample",
            foreignField: "_id",
            as: "linkedSample",
          },
        },

        {
          $lookup: {
            from: "testresults",
            localField: "linked_entity.test_result",
            foreignField: "_id",
            as: "linkedTest",
          },
        },

        // Lookup users and CAPA
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
            from: "capas",
            localField: "resolution.linked_capa",
            foreignField: "_id",
            as: "linkedCapa",
          },
        },

        {
          $project: {
            "Deviation ID": "$deviation_no",
            "Source System": { $ifNull: ["$source_system", "LIMS"] },
            Severity: "$severity",
            "Linked Entity": {
              $cond: [
                { $gt: [{ $size: "$linkedSample" }, 0] },
                { $arrayElemAt: ["$linkedSample.sample_id", 0] },
                {
                  $cond: [
                    { $gt: [{ $size: "$linkedTest" }, 0] },
                    { $arrayElemAt: ["$linkedTest.test_id", 0] },
                    { $ifNull: ["$linked_entity.equipment", "N/A"] },
                  ],
                },
              ],
            },
            Status: "$status",
            Type: { $ifNull: ["$deviation_type", "OOS"] },
            Title: "$title",
            Description: "$description",
            CAPA: {
              $cond: [{ $gt: [{ $size: "$linkedCapa" }, 0] }, "Yes", "No"],
            },
            "Reported By": {
              $ifNull: [{ $arrayElemAt: ["$raisedBy.name", 0] }, "Unknown"],
            },
            Date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$raised_at",
              },
            },
            "Age (Days)": {
              $round: [
                {
                  $divide: [
                    { $subtract: [new Date(), "$raised_at"] },
                    86400000,
                  ],
                },
                0,
              ],
            },
          },
        },

        { $sort: { Date: -1 } },
      ]);

      // Calculate summary
      const summary = {
        batchId: batch.api_batch_id,
        customer: batch.customer?.name || "Unknown",
        project: batch.project?.project_name || "Unknown",
        exportDate: new Date().toISOString().split("T")[0],
        totalDeviations: exportData.length,
        openDeviations: exportData.filter((d) =>
          ["Open", "In-Progress"].includes(d.Status)
        ).length,
        criticalDeviations: exportData.filter((d) => d.Severity === "Critical")
          .length,
        majorDeviations: exportData.filter((d) => d.Severity === "Major")
          .length,
        minorDeviations: exportData.filter((d) => d.Severity === "Minor")
          .length,
      };

      // Audit log
      console.log(
        `📤 Deviations exported - Batch: ${batchId}, Format: ${format}, User: ${
          req.headers["user-id"] || "anonymous"
        }`
      );

      res.json({
        success: true,
        data: {
          summary,
          deviations: exportData,
          format,
          exportMetadata: {
            generatedAt: new Date(),
            totalRecords: exportData.length,
            filters: { status, severity },
          },
        },
      });
    } catch (error) {
      console.error("❌ Error exporting deviations:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}
export default new DeviationCapaController();
// ================================
// GET DEVIATION STATISTICS
// Route: GET /api/batches/:batchId/deviation-statistics
// Purpose: Get comprehensive deviation statistics
// ================================
