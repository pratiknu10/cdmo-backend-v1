import mongoose from "mongoose";
import * as dateFns from "date-fns";

import { BatchModel } from "../models/batchModel.js";
import { DeviationModel } from "../models/deviationModel.js";
import { EquipmentEventModel } from "../models/equipmentEventModel.js";
import { ProcessStepModel } from "../models/processStepModel.js";
import { EquipmentModel } from "../models/equipmentModel.js";
export const getEquipmentsByBID = async (req, res) => {
  try {
    const { batchId } = req.params;

    // 1. Validate that the provided ID is a valid Mongoose ObjectId
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Batch ID format",
      });
    }

    // 2. Fetch the Batch to ensure it exists
    const batch = await BatchModel.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // 3. Find all equipment events related to this batch
    const equipmentEvents = await EquipmentEventModel.find({
      related_batch: batchId,
    }).populate("equipment"); // Populate equipment details from the EquipmentModel

    // 4. Collect all unique equipment used in the batch's process steps
    const equipmentMap = new Map();
    const processStepUsage = new Map(); // Map to store equipment ID to a list of process steps

    for (const event of equipmentEvents) {
      if (event.equipment && event.equipment._id) {
        const equipmentIdString = event.equipment._id.toString();
        if (!equipmentMap.has(equipmentIdString)) {
          equipmentMap.set(equipmentIdString, event.equipment);
        }

        if (!processStepUsage.has(equipmentIdString)) {
          processStepUsage.set(equipmentIdString, new Set());
        }
        // Add the process step to the set to avoid duplicates
        processStepUsage.get(equipmentIdString).add(event.related_process_step);
      }
    }

    const equipmentList = Array.from(equipmentMap.values());

    // 5. Calculate Summary Metrics (Top Panel)
    let operationalCount = 0;
    let calibrationDueCount = 0;
    let pmComplianceCount = 0;
    let totalOpenIssues = 0;

    for (const eq of equipmentList) {
      // "Available" is considered operational
      if (eq.status === "Available") {
        operationalCount++;
      }
      // "Due" is considered calibration due
      if (
        eq.calibration_status === "Due" ||
        eq.calibration_status === "Overdue"
      ) {
        calibrationDueCount++;
      }
      // Placeholder: Assume PM compliance if next maintenance date is in the future
      if (
        eq.next_maintenance_date &&
        new Date(eq.next_maintenance_date) > new Date()
      ) {
        pmComplianceCount++;
      }

      // Count open issues for each equipment.
      const openIssues = await DeviationModel.countDocuments({
        "linked_entity.entity_id": eq._id.toString(),
        "linked_entity.entity_type": "Equipment",
        status: "Open",
      });
      totalOpenIssues += openIssues;
    }

    const summaryMetrics = {
      total_equipment: equipmentList.length,
      operational: operationalCount,
      calibration_due: calibrationDueCount,
      open_issues: totalOpenIssues,
      pm_compliance: pmComplianceCount,
    };

    // 6. Build Equipment Table Layout
    const equipmentTable = await Promise.all(
      equipmentList.map(async (eq) => {
        const openIssuesCount = await DeviationModel.countDocuments({
          "linked_entity.entity_id": eq._id.toString(),
          "linked_entity.entity_type": "Equipment",
          status: "Open",
        });

        // Fetch process steps to get their names and sequence
        const processStepIds = Array.from(
          processStepUsage.get(eq._id.toString()) || []
        );
        const processSteps = await ProcessStepModel.find({
          _id: { $in: processStepIds },
        });

        // Sort by step sequence for a clean display
        processSteps.sort((a, b) => a.step_sequence - b.step_sequence);

        const usageSteps = processSteps
          .map((step) => `Step ${step.step_sequence}: ${step.step_name}`)
          .join(", ");

        return {
          equipment_id: eq._id.toString(),
          name: eq.name,
          type: eq.model, // Using 'model' as a placeholder for 'type' as per the sample
          location: eq.location,
          status: eq.status,
          last_maintenance: eq.last_cleaned_on
            ? dateFns.format(new Date(eq.last_cleaned_on), "yyyy-MM-dd")
            : "N/A",
          next_maintenance: eq.next_maintenance_date
            ? dateFns.format(new Date(eq.next_maintenance_date), "yyyy-MM-dd")
            : "N/A",
          calibration_status: eq.calibration_status,
          calibration_due: eq.next_calibration_due_date
            ? dateFns.format(
                new Date(eq.next_calibration_due_date),
                "yyyy-MM-dd"
              )
            : "N/A",
          open_issues: openIssuesCount,
          qa_approval_status: eq.qa_status || "Pending", // Placeholder
          usage_in_batch: usageSteps || "N/A",
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        summary_metrics: summaryMetrics,
        equipment_table: equipmentTable,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching equipment overview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getEquipmentDetail = async (req, res) => {
  try {
    const { equipmentId } = req.params;

    // 1. Fetch the primary equipment document using findOne to support string _id
    const equipment = await EquipmentModel.findOne({ _id: equipmentId });
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
    }

    // 2. Fetch all maintenance-related events for this equipment.
    // We use the string equipmentId to find related events.
    const maintenanceEvents = await EquipmentEventModel.find({
      equipment: equipmentId,
      event_type: { $in: ["Maintenance", "Cleaning", "Calibration"] }, // Filter for relevant event types
    }).sort({ timestamp: -1 }); // Sort by most recent first

    // 3. Fetch all open deviations (issues) linked to this equipment.
    // The linked_entity.entity_id field is a string, so this query remains the same.
    const openIssues = await DeviationModel.find({
      "linked_entity.entity_id": equipmentId,
      "linked_entity.entity_type": "Equipment",
      status: "Open",
    });

    // 4. Build the final response object
    const responseData = {
      equipment_details: {
        _id: equipment._id,
        equipment_id: equipment._id.toString(),
        name: equipment.name,
        model: equipment.model,
        type: equipment.type,
        location: equipment.location,
        status: equipment.status,
        last_calibrated_on: equipment.last_calibrated_on
          ? dateFns.format(new Date(equipment.last_calibrated_on), "yyyy-MM-dd")
          : "N/A",
        calibration_status: equipment.calibration_status,
        last_cleaned_on: equipment.last_cleaned_on
          ? dateFns.format(new Date(equipment.last_cleaned_on), "yyyy-MM-dd")
          : "N/A",
        // Add any other relevant metadata fields from your schema
        // For example:
        // last_maintenance: equipment.last_maintenance_date ? dateFns.format(new Date(equipment.last_maintenance_date), 'yyyy-MM-dd') : 'N/A',
        // next_maintenance: equipment.next_maintenance_date ? dateFns.format(new Date(equipment.next_maintenance_date), 'yyyy-MM-dd') : 'N/A',
        // qa_approval_status: equipment.qa_status || 'Pending',
      },
      maintenance_history: maintenanceEvents.map((event) => ({
        event_type: event.event_type,
        timestamp: dateFns.format(
          new Date(event.timestamp),
          "yyyy-MM-dd HH:mm:ss"
        ),
        notes: event.notes,
        related_batch: event.related_batch
          ? event.related_batch.toString()
          : "N/A",
      })),
      open_issues: openIssues.map((issue) => ({
        deviation_no: issue.deviation_no,
        title: issue.title,
        severity: issue.severity,
        status: issue.status,
      })),
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error fetching equipment details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
