const {
  getPeakOccupancyByZoneAndBuilding,
  getAvgDwellTimeByZoneAndBuilding,
  getActivityLevelByZoneAndBuilding,
} = require('../services/heatmapService');

async function getPeakOccupancy(req, res) {
  try {
    const hours = req.query.hours;
    const zone = req.query.zone?.trim();
    const building = req.query.building?.trim();
    console.log('getPeakOccupancy called with', hours, zone, building);
    const result = await getPeakOccupancyByZoneAndBuilding(hours, zone, building);
    res.json(result);
  } catch (error) {
    console.error('Error in getPeakOccupancy:', error);
    res.status(500).json({ error: 'Failed to fetch peak occupancy', details: error.message });
  }
}

async function getAvgDwellTime(req, res) {
  try {
    const hours = req.query.hours;
    const zone = req.query.zone?.trim();
    const building = req.query.building?.trim();
    console.log('getAvgDwellTime called with', hours, zone, building);
    const result = await getAvgDwellTimeByZoneAndBuilding(hours, zone, building);
    res.json(result);
  } catch (error) {
    console.error('Error in getAvgDwellTime:', error);
    res.status(500).json({ error: 'Failed to fetch average dwell time', details: error.message });
  }
}

async function getActivityLevel(req, res) {
  try {
    const hours = req.query.hours;
    const zone = req.query.zone?.trim();
    const building = req.query.building?.trim();
    console.log('getActivityLevel called with', hours, zone, building);
    const result = await getActivityLevelByZoneAndBuilding(hours, zone, building);
    res.json(result);
  } catch (error) {
    console.error('Error in getActivityLevel:', error);
    res.status(500).json({ error: 'Failed to fetch activity level', details: error.message });
  }
}

module.exports = {
  getPeakOccupancy,
  getAvgDwellTime,
  getActivityLevel,
};
