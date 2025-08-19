import { LogModel } from "../models/logModel.js";

export const getLogs = async (req, res) => {
  try {
    const logs = await LogModel.find({}).sort({ timestamp: -1 }).limit(100);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
