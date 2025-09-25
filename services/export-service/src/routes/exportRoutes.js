const express = require('express');
const router = express.Router();

const {
  generateAttendancePDFReport,
  generateAttendanceCSVReport,
  generateMovementPDFReport,
  generateMovementCSVReport,
  generateSecurityPDFReport,
  generateEventPDFReport
} = require('../controllers/exportController');

// ---------------- Attendance Reports ----------------
router.get('/attendance/pdf/:day', generateAttendancePDFReport);
router.get('/attendance/pdf', generateAttendancePDFReport);
router.get('/attendance/csv/:day', generateAttendanceCSVReport);
router.get('/attendance/csv', generateAttendanceCSVReport);

// ---------------- Movement Reports ----------------
router.get('/movement/pdf/:day', generateMovementPDFReport);
router.get('/movement/pdf', generateMovementPDFReport);
router.get('/movement/csv/:day', generateMovementCSVReport);
router.get('/movement/csv', generateMovementCSVReport);

// ---------------- Security Reports ----------------
router.get('/security/pdf/:day', generateSecurityPDFReport);
router.get('/security/pdf', generateSecurityPDFReport);

// ---------------- Event Reports ----------------
// With day filter (1-5)
router.get('/event/pdf/:day', generateEventPDFReport);
router.get('/event/pdf', generateEventPDFReport);

module.exports = router;
