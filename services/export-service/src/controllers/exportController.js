const path = require("path");
const fs = require("fs");

const { generateAttendanceUsagePDF } = require('../services/attendanceUsagePDF');
const { generateMovementFlowPDF } = require('../services/movementFlowPDF');
const { generateSecurityExceptionPDF } = require('../services/securityExceptionPDF');

const { generateAttendanceUsageCSV } = require('../services/attendanceUsageCSV');
const { generateMovementFlowCSV } = require('../services/movementFlowCSV'); 

const { generateEventPDF } = require("../services/eventSummaryPDF");

// Helper to get correct file path
const resolveFilePath = (filename) => {
  // If filename is absolute, use it as is
  if (path.isAbsolute(filename)) return filename;
  // Otherwise, resolve relative to export-service/exports
  return path.join(__dirname, "..", "..", "exports", filename);
};

// ---------------- Attendance & Usage ----------------
const generateAttendancePDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const filename = await generateAttendanceUsagePDF({ day: dayParam });
    const filePath = resolveFilePath(filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Attendance PDF error:", err);
    res.status(500).json({ message: "Error generating Attendance & Usage PDF", error: err.message });
  }
};

const generateAttendanceCSVReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const filename = await generateAttendanceUsageCSV({ day: dayParam });
    const filePath = resolveFilePath(filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Attendance CSV error:", err);
    res.status(500).json({ message: "Error generating Attendance & Usage CSV", error: err.message });
  }
};

// ---------------- Movement & Flow ----------------
const generateMovementPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const filename = await generateMovementFlowPDF({ day: dayParam });
    const filePath = resolveFilePath(filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Movement PDF error:", err);
    res.status(500).json({ message: "Error generating Movement & Flow PDF", error: err.message });
  }
};

const generateMovementCSVReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const filename = await generateMovementFlowCSV({ day: dayParam });
    const filePath = resolveFilePath(filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Movement CSV error:", err);
    res.status(500).json({ message: "Error generating Movement & Flow CSV", error: err.message });
  }
};

// ---------------- Security & Exception ----------------
const generateSecurityPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const overstayMinutes = req.query.overstay ? Number(req.query.overstay) : undefined;
    const congestionThreshold = req.query.congestion ? Number(req.query.congestion) : undefined;
    const restrictedList = typeof req.query.restricted === 'string' && req.query.restricted.length
      ? req.query.restricted.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const filename = await generateSecurityExceptionPDF({
      day: dayParam,
      overstayMinutes,
      congestionThreshold,
      restrictedList
    });

    const filePath = resolveFilePath(filename);
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Security PDF error:", err);
    res.status(500).json({ message: "Error generating Security & Exception PDF", error: err.message });
  }
};

// ---------------- Events ----------------
const generateEventPDFReport = async (req, res) => {
  try {
    const dayParam = req.params.day ? Number(req.params.day) : undefined;
    if (dayParam !== undefined && (dayParam < 1 || dayParam > 5)) {
      return res.status(400).send("Invalid day. Allowed values are 1-5.");
    }

    const filename = await generateEventPDF({ day: dayParam });
    const filePath = resolveFilePath(filename);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(500).send("Export file not found");
    }

    res.download(filePath);
  } catch (err) {
    console.error("Event PDF error:", err);
    res.status(500).send("Failed to generate Event PDF");
  }
};

module.exports = {
  generateAttendancePDFReport,
  generateAttendanceCSVReport,
  generateMovementPDFReport,
  generateMovementCSVReport, 
  generateSecurityPDFReport,
  generateEventPDFReport
};
