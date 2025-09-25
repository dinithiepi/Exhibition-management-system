const express = require('express');
const router = express.Router();
const heatmapController = require('../controller/heatmapController');

router.get('/peak-occupancy', heatmapController.getPeakOccupancy);
router.get('/avg-dwell-time', heatmapController.getAvgDwellTime);
router.get('/activity-level', heatmapController.getActivityLevel);

router.get('/test', (req, res) => {
  res.json({ message: 'API is reachable' });
});

module.exports = router;
