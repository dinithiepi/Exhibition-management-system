const analyticsService = require("../services/analyticsService");

// 1. Total visitors in a building (count_per_day)
async function getTotalVisitors(req, res) {
  try {
    const { buildingId } = req.query;   // removed date
    const data = await analyticsService.getTotalVisitors(buildingId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total visitors" });
  }
}

// 2. Total check-ins (real-time visitors in a building right now)
async function getTotalCheckIns(req, res) {
  try {
    const { buildingId } = req.query;   // removed date
    const data = await analyticsService.getTotalCheckIns(buildingId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total check-ins" });
  }
}

// 3. Average duration (use EntryExitLog if qr exists)
async function getAverageDuration(req, res) {
  try {
    const { buildingId, slot } = req.query;  // removed date
    const data = await analyticsService.getAverageDuration(buildingId, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch average duration" });
  }
}

// 4. Repeat visitors (use EntryExitLog if qr exists)
async function getRepeatVisitors(req, res) {
  try {
    const { buildingId, slot } = req.query;  // removed date
    const data = await analyticsService.getRepeatVisitors(buildingId, slot);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch repeat visitors" });
  }
}

// 5. Top 3 buildings ranked by visitors
async function getTop3Buildings(req, res) {
  try {
    const data = await analyticsService.getTop3Buildings();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top 3 buildings" });
  }
}

// 6. Top 10 buildings ranked by visitors
async function getVisitorsPerBuilding(req, res) {
  try {
    const data = await analyticsService.getVisitorsPerBuilding();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch visitors per building" });
  }
}

module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding
};
