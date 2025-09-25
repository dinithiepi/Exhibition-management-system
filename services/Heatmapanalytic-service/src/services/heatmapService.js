const pool = require('../utils/db');

const zoneToBuildingsMap = {
  "Zone A": ["B13", "B15", "B6", "B10"],
  "Zone B": ["B33", "B16", "B7", "B12", "B11"],
  "Zone C": ["B34", "B20", "B19", "B31", "B28"],
  "Zone D": ["B30", "B24", "B23", "B29", "B4", "B2", "B1"],
  "Other": ["B14", "B17", "B18", "B22", "B32", "B8", "B9"]
};

function validateDuration(durationHours) {
  const hours = parseInt(durationHours, 10);
  if (isNaN(hours) || hours <= 0 || hours > 168) return 24;
  return hours;
}

function getBuildingsForZoneAndBuilding(zone, building) {
  if (!zone) throw new Error('Zone is required');

  const buildings = zoneToBuildingsMap[zone];
  if (!buildings) {
    throw new Error('Invalid zone');
  }

  if (!building || building === "All") {
    return buildings;
  }

  if (!buildings.includes(building)) {
    throw new Error('Building does not belong to the selected zone');
  }

  return [building];
}

function queryWithTimeout(queryText, params, timeoutMs = 20000) {
  return Promise.race([
    pool.query(queryText, params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB query timeout')), timeoutMs)
    ),
  ]);
}

async function getPeakOccupancyByZoneAndBuilding(durationHours, zone, building) {
  const hours = validateDuration(durationHours);
  const buildings = getBuildingsForZoneAndBuilding(zone, building);
  const query = `
    SELECT building_id as building,
           SUM(CASE WHEN direction = 'IN' THEN 1 ELSE -1 END) AS net_occupancy
    FROM "EntryExitLog"
    WHERE building_id = ANY($1)
      AND entry_time >= NOW() - INTERVAL '${hours} hours'
    GROUP BY building_id
    ORDER BY building_id;
  `;
  try {
    const { rows } = await queryWithTimeout(query, [buildings]);
    return rows.map(row => ({
      building: row.building,
      peak_occupancy: Math.max(row.net_occupancy, 0),
    }));
  } catch (error) {
    console.error('Error in getPeakOccupancy:', error);
    throw error;
  }
}

async function getAvgDwellTimeByZoneAndBuilding(durationHours, zone, building) {
  const hours = validateDuration(durationHours);
  const buildings = getBuildingsForZoneAndBuilding(zone, building);
  const query = `
    SELECT building_id AS building,
           AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60) AS avg_dwell_time_minutes
    FROM "EntryExitLog"
    WHERE building_id = ANY($1)
      AND entry_time >= NOW() - INTERVAL '${hours} hours'
      AND exit_time IS NOT NULL
    GROUP BY building_id
    ORDER BY building_id;
  `;
  try {
    const { rows } = await queryWithTimeout(query, [buildings]);
    return rows;
  } catch (error) {
    console.error('Error in getAvgDwellTime:', error);
    throw error;
  }
}

async function getActivityLevelByZoneAndBuilding(durationHours, zone, building) {
  const hours = validateDuration(durationHours);
  const buildings = getBuildingsForZoneAndBuilding(zone, building);
  const query = `
    SELECT building_id AS building,
           COUNT(DISTINCT tag_id) AS unique_visitors,
           COUNT(CASE WHEN direction = 'IN' THEN 1 END) AS entries,
           COUNT(CASE WHEN direction = 'OUT' THEN 1 END) AS exits
    FROM "EntryExitLog"
    WHERE building_id = ANY($1)
      AND entry_time >= NOW() - INTERVAL '${hours} hours'
    GROUP BY building_id
    ORDER BY building_id;
  `;
  try {
    const { rows } = await queryWithTimeout(query, [buildings]);
    return rows.map(row => ({
      ...row,
      activity_level: row.unique_visitors > 100 ? 'High' : row.unique_visitors > 30 ? 'Medium' : 'Low',
    }));
  } catch (error) {
    console.error('Error in getActivityLevel:', error);
    throw error;
  }
}

module.exports = {
  getPeakOccupancyByZoneAndBuilding,
  getAvgDwellTimeByZoneAndBuilding,
  getActivityLevelByZoneAndBuilding
};
