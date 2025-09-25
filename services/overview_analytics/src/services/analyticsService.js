const db = require("../utils/db");

// 1. Total visitors (count_per_day)
async function getTotalVisitors(buildingId) {
  let query, params;
  if (buildingId) {
    query = `SELECT dept_name, count_per_day AS total_visitors 
             FROM "BUILDING" 
             WHERE building_id = $1`;
    params = [buildingId];
  } else {
    query = `SELECT SUM(count_per_day) AS total_visitors FROM "BUILDING"`;
    params = [];
  }
  const { rows } = await db.query(query, params);
  return rows[0];
}

// 2. Total check-ins (real-time visitors, total_count)
async function getTotalCheckIns(buildingId) {
  let query, params;
  if (buildingId) {
    query = `SELECT dept_name, total_count AS total_checkins 
             FROM "BUILDING" 
             WHERE building_id = $1`;
    params = [buildingId];
  } else {
    query = `SELECT SUM(total_count) AS total_checkins FROM "BUILDING"`;
    params = [];
  }
  const { rows } = await db.query(query, params);
  return rows[0];
}

// 3. Average duration (logs only)
async function getAverageDuration(buildingId, slot) {
  const query = `
    SELECT EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60 AS duration
    FROM "EntryExitLog"
    WHERE building_id = $1 
      AND exit_time IS NOT NULL
  `;
  const { rows } = await db.query(query, [buildingId]);
  if (rows.length === 0) return { averageDuration: 0 };

  const avg =
    rows.reduce((sum, r) => sum + Number(r.duration), 0) / rows.length;

  return { averageDuration: Math.round(avg) };
}

// 4. Repeat visitors (logs only)
async function getRepeatVisitors(buildingId, slot) {
  const query = `
    SELECT tag_id, COUNT(*) AS visits
    FROM "EntryExitLog"
    WHERE building_id = $1
    GROUP BY tag_id
  `;
  const { rows } = await db.query(query, [buildingId]);

  const repeatVisitors = rows.filter(r => Number(r.visits) > 1).length;
  return { repeatVisitors };
}

// 5. Top 3 buildings
async function getTop3Buildings() {
  const query = `
    SELECT dept_name AS building, count_per_day AS visitors
    FROM "BUILDING"
    ORDER BY count_per_day DESC, dept_name ASC
    LIMIT 3
  `;
  const { rows } = await db.query(query);
  return rows;
}

// 6. Top 10 buildings
async function getVisitorsPerBuilding() {
  const query = `
    SELECT dept_name AS building, count_per_day AS total_visitors
    FROM "BUILDING"
    ORDER BY count_per_day DESC, dept_name ASC
    LIMIT 10
  `;
  const { rows } = await db.query(query);
  return rows;
}

module.exports = {
  getTotalVisitors,
  getTotalCheckIns,
  getAverageDuration,
  getRepeatVisitors,
  getTop3Buildings,
  getVisitorsPerBuilding
};
