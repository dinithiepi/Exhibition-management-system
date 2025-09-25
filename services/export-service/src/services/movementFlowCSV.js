// src/services/movementFlowCSV.js
const fs = require("fs");
const path = require("path");
const pool = require("../utils/db3.js"); // adjust as needed
const { getDateForDay } = require("../utils/dates");
const { parse } = require("json2csv"); // npm i json2csv

function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

async function generateMovementFlowCSV({ day } = {}) {
  try {
    const filterDate = day ? getDateForDay(day) : null;
    const params = filterDate ? [filterDate] : [];
    // ---- Queries (same as PDF) ----
    const entryExitSlotsRes = await pool.query(`
      SELECT slot,
        SUM(entry_count)::int AS entries,
        SUM(exit_count)::int AS exits
      FROM (
        SELECT
          CASE
            WHEN entry_time::time >= '10:00'::time AND entry_time::time < '13:00'::time THEN '10am-1pm'
            WHEN entry_time::time >= '13:00'::time AND entry_time::time < '16:00'::time THEN '1pm-4pm'
            WHEN entry_time::time >= '16:00'::time AND entry_time::time < '19:00'::time THEN '4pm-7pm'
            ELSE 'other'
          END AS slot,
          1 AS entry_count,
          0 AS exit_count
        FROM "EntryExitLog"
        WHERE entry_time IS NOT NULL
        ${day ? 'AND DATE(entry_time) = $1::date' : ''}
        UNION ALL
        SELECT
          CASE
            WHEN exit_time::time >= '10:00'::time AND exit_time::time < '13:00'::time THEN '10am-1pm'
            WHEN exit_time::time >= '13:00'::time AND exit_time::time < '16:00'::time THEN '1pm-4pm'
            WHEN exit_time::time >= '16:00'::time AND exit_time::time < '19:00'::time THEN '4pm-7pm'
            ELSE 'other'
          END AS slot,
          0 AS entry_count,
          1 AS exit_count
        FROM "EntryExitLog"
        WHERE exit_time IS NOT NULL
        ${day ? 'AND DATE(exit_time) = $1::date' : ''}
      ) e
      GROUP BY slot
      ORDER BY slot;
    `, params);

    const transitionsRes = await pool.query(`
      WITH ordered AS (
        SELECT tag_id, building_id, entry_time,
               ROW_NUMBER() OVER (PARTITION BY tag_id ORDER BY entry_time) rn
        FROM "EntryExitLog"
        WHERE entry_time IS NOT NULL
        ${day ? 'AND DATE(entry_time) = $1::date' : ''}
      ),
      pairs AS (
        SELECT a.tag_id,
               SUBSTRING(a.building_id::text,1,1) AS from_zone,
               SUBSTRING(b.building_id::text,1,1) AS to_zone
        FROM ordered a
        JOIN ordered b ON a.tag_id = b.tag_id AND b.rn = a.rn + 1
        WHERE a.building_id IS NOT NULL AND b.building_id IS NOT NULL
      )
      SELECT from_zone, to_zone, COUNT(*)::int AS transitions
      FROM pairs
      GROUP BY from_zone, to_zone
      ORDER BY transitions DESC
      LIMIT 50;
    `, params);

    const busiestBuildingsRes = await pool.query(`
      SELECT b.dept_name, e.building_id, COUNT(*)::int AS entries
      FROM "EntryExitLog" e
      JOIN "BUILDING" b ON e.building_id = b.building_id
      ${day ? 'WHERE DATE(e.entry_time) = $1::date' : ''}
      GROUP BY b.dept_name, e.building_id
      ORDER BY entries DESC
      LIMIT 50;
    `, params);

    const busiestZonesRes = await pool.query(`
      SELECT zone, COUNT(DISTINCT tag_id)::int AS unique_visitors
      FROM (
        SELECT tag_id, SUBSTRING(building_id::text,1,1) AS zone FROM "EntryExitLog"
        WHERE building_id IS NOT NULL
        ${day ? 'AND DATE(entry_time) = $1::date' : ''}
      ) s
      GROUP BY zone
      ORDER BY unique_visitors DESC;
    `, params);

    const avgBuildingsPerPersonRes = await pool.query(`
      SELECT AVG(cnt)::numeric(10,2) AS avg_buildings
      FROM (
        SELECT tag_id, COUNT(DISTINCT building_id) AS cnt
        FROM "EntryExitLog"
        GROUP BY tag_id
      ) t;
    `);

    // ---- Data
    const entryExitSlots = entryExitSlotsRes.rows || [];
    const transitions = transitionsRes.rows || [];
    const busiestBuildings = busiestBuildingsRes.rows || [];
    const busiestZones = busiestZonesRes.rows || [];
    const avgBuildingsPerPerson = avgBuildingsPerPersonRes.rows[0]
      ? Number(avgBuildingsPerPersonRes.rows[0].avg_buildings)
      : 0;

    // ---- Build CSV strings ----
    const csvDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = path.join(csvDir, `movement_flow${day ? `_day${day}` : ''}_${timestamp}.csv`);

    let combinedCSV = "";

    // Section 1
    combinedCSV += "Entry vs Exit by Time Slot\n";
    combinedCSV += parse(entryExitSlots, { fields: ["slot", "entries", "exits"] }) + "\n\n";

    // Section 2
    combinedCSV += "Zone Transitions (Top 50)\n";
    combinedCSV += parse(transitions, { fields: ["from_zone", "to_zone", "transitions"] }) + "\n\n";

    // Section 3
    combinedCSV += "Busiest Buildings\n";
    combinedCSV += parse(busiestBuildings, { fields: ["dept_name", "building_id", "entries"] }) + "\n\n";

    // Section 4
    combinedCSV += "Busiest Zones\n";
    combinedCSV += parse(busiestZones, { fields: ["zone", "unique_visitors"] }) + "\n\n";

    // Section 5
    combinedCSV += `Average Buildings Visited per Person\nValue,${avgBuildingsPerPerson}\n`;

    fs.writeFileSync(filepath, combinedCSV, "utf8");

    return filepath;
  } catch (err) {
    console.error("Error generating Movement & Flow CSV:", err);
    throw err;
  }
}

module.exports = { generateMovementFlowCSV };
