// src/services/attendanceUsageCSV.js
const fs = require("fs");
const path = require("path");
const pool = require("../utils/db3.js"); // adjust as needed
const { getDateForDay } = require("../utils/dates");
const { Parser } = require("json2csv");

function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtMinutes(mins) {
  const n = safeNum(mins);
  if (n === 0) return "0.0 mins";
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = Math.round(n % 60);
    return `${h}h ${m}m (${n.toFixed(1)} mins)`;
  }
  return `${n.toFixed(1)} mins`;
}

async function generateAttendanceUsageCSV({ day } = {}) {
  try {
    const filterDate = day ? getDateForDay(day) : null;
    const whereDay = filterDate ? `WHERE DATE(e.entry_time) = $1::date` : '';
    const params = filterDate ? [filterDate] : [];
    // ---- Queries ----
    // Total visits per building (count of rows)
    const totalVisitsRes = await pool.query(`
      SELECT b.dept_name, b.building_id, COUNT(*)::int AS visits
      FROM "EntryExitLog" e
      JOIN "BUILDING" b ON e.building_id = b.building_id
      ${whereDay}
      GROUP BY b.dept_name, b.building_id
      ORDER BY visits DESC;
    `, params);

    // Unique visitors per building
    const uniqueVisitorsRes = await pool.query(`
      SELECT b.dept_name, b.building_id, COUNT(DISTINCT e.tag_id)::int AS unique_visitors
      FROM "EntryExitLog" e
      JOIN "BUILDING" b ON e.building_id = b.building_id
      ${whereDay}
      GROUP BY b.dept_name, b.building_id;
    `, params);

    // Avg duration per building (minutes)
    const avgTimeRes = await pool.query(`
      SELECT b.dept_name, b.building_id, AVG(EXTRACT(EPOCH FROM (e.exit_time - e.entry_time))/60)::numeric(10,2) AS avg_minutes
      FROM "EntryExitLog" e
      JOIN "BUILDING" b ON e.building_id = b.building_id
      WHERE e.exit_time IS NOT NULL
      ${day ? 'AND DATE(e.entry_time) = $1::date' : ''}
      GROUP BY b.dept_name, b.building_id;
    `, params);

    // Peak entry times (hourly distribution)
    const peakHourRes = await pool.query(`
      SELECT EXTRACT(HOUR FROM entry_time)::int AS hour, COUNT(*)::int AS entries
      FROM "EntryExitLog" e
      ${whereDay}
      GROUP BY hour
      ORDER BY hour ASC;
    `, params);

    // Repeat visits (tag_id with count > 1)
    const repeatVisitsRes = await pool.query(`
      SELECT tag_id, COUNT(*)::int AS visits
      FROM "EntryExitLog" e
      ${whereDay}
      GROUP BY tag_id
      HAVING COUNT(*) > 1
      ORDER BY visits DESC;
    `, params);

    // Repeat visits (same tag_id multiple times, with building and entry_time)
    const repeatVisitsDetailRes = await pool.query(`
      SELECT tag_id, building_id, entry_time
      FROM "EntryExitLog" e
      ${whereDay}
      AND tag_id IN (
        SELECT tag_id
        FROM "EntryExitLog"
        ${whereDay.replace('WHERE','WHERE')}
        GROUP BY tag_id
        HAVING COUNT(*) > 1
      )
      ORDER BY tag_id, entry_time;
    `, params);

    // Zone heatmap: map first char of building_id as zone
    const zoneHeatmapRes = await pool.query(`
      SELECT SUBSTRING(building_id::text,1,1) AS zone, COUNT(*)::int AS visits
      FROM "EntryExitLog" e
      ${whereDay}
      GROUP BY zone
      ORDER BY visits DESC;
    `, params);

    // Visitors per time slot (slots defined)
    const slotVisitsRes = await pool.query(`
      SELECT slot, COUNT(*)::int AS visits
      FROM (
        SELECT
         CASE
           WHEN entry_time::time >= '10:00'::time AND entry_time::time < '13:00'::time THEN '10-13'
           WHEN entry_time::time >= '13:00'::time AND entry_time::time < '16:00'::time THEN '13-16'
           WHEN entry_time::time >= '16:00'::time AND entry_time::time < '19:00'::time THEN '16-19'
           ELSE 'other'
         END AS slot
        FROM "EntryExitLog" e
        ${whereDay}
      ) s
      GROUP BY slot
      ORDER BY slot;
    `, params);

    // ---- Prepare metrics ----
    const totalVisits = totalVisitsRes.rows || [];
    const uniqueVisitors = uniqueVisitorsRes.rows || [];
    const avgTime = avgTimeRes.rows || [];
    const repeatVisits = repeatVisitsRes.rows || [];
    const peakHour = peakHourRes.rows || [];
    const repeatVisitsDetail = repeatVisitsDetailRes.rows || [];
    const zoneHeat = zoneHeatmapRes.rows || [];
    const slotVisits = slotVisitsRes.rows || [];

    // Table headings
    const headings = [
      "Building",
      "Building ID",
      "Total Visits",
      "Unique Visitors",
      "Repeat Visits",
      "Avg Duration",
      "Peak Entry Hour"
    ];

    // Build metrics rows for CSV
    const metrics = totalVisits.map(tv => {
      const uv = uniqueVisitors.find(u => u.building_id === tv.building_id);
      const av = avgTime.find(a => a.building_id === tv.building_id);
      // Count repeat visits for this building
      const repeatCount = repeatVisitsDetail.filter(r => r.building_id === tv.building_id).length;
      const peak = peakHour.length > 0 ? `${peakHour[0].hour}:00 (${peakHour[0].entries})` : "N/A";
      return {
        "Building": tv.dept_name,
        "Building ID": tv.building_id,
        "Total Visits": String(tv.visits),
        "Unique Visitors": String(uv ? uv.unique_visitors : 0),
        "Repeat Visits": String(repeatCount),
        "Avg Duration": av ? fmtMinutes(av.avg_minutes) : "N/A",
        "Peak Entry Hour": peak
      };
    });

    // Add summary row
    const summaryRow = {
      "Building": "SUMMARY",
      "Building ID": "",
      "Total Visits": totalVisits.reduce((sum, r) => sum + safeNum(r.visits), 0),
      "Unique Visitors": uniqueVisitors.reduce((sum, r) => sum + safeNum(r.unique_visitors), 0),
      "Repeat Visits": repeatVisits.length,
      "Avg Duration": "",
      "Peak Entry Hour": ""
    };

    // Add slot summary rows
    const slotRows = [
      {
        "Building": "Time Slot: 10-13",
        "Building ID": "",
        "Total Visits": slotVisits.find(s => s.slot === "10-13")?.visits || 0,
        "Unique Visitors": "",
        "Repeat Visits": "",
        "Avg Duration": "",
        "Peak Entry Hour": ""
      },
      {
        "Building": "Time Slot: 13-16",
        "Building ID": "",
        "Total Visits": slotVisits.find(s => s.slot === "13-16")?.visits || 0,
        "Unique Visitors": "",
        "Repeat Visits": "",
        "Avg Duration": "",
        "Peak Entry Hour": ""
      },
      {
        "Building": "Time Slot: 16-19",
        "Building ID": "",
        "Total Visits": slotVisits.find(s => s.slot === "16-19")?.visits || 0,
        "Unique Visitors": "",
        "Repeat Visits": "",
        "Avg Duration": "",
        "Peak Entry Hour": ""
      },
      {
        "Building": "Time Slot: other",
        "Building ID": "",
        "Total Visits": slotVisits.find(s => s.slot === "other")?.visits || 0,
        "Unique Visitors": "",
        "Repeat Visits": "",
        "Avg Duration": "",
        "Peak Entry Hour": ""
      }
    ];

    // Combine all rows with spacing
    const allRows = [
      ...metrics,
      {}, // Blank row for spacing
      summaryRow,
      {}, // Blank row for spacing
      ...slotRows
    ];

    // Convert to CSV with headings
    const parser = new Parser({ fields: headings });
    const csv = parser.parse(allRows);

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `attendance_usage${day ? `_day${day}` : ''}_${timestamp}.csv`;
    const exportsDir = path.resolve(__dirname, "..", "..", "exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    fs.writeFileSync(filepath, csv);

    return filepath;
  } catch (err) {
    console.error("Error generating Attendance & Usage CSV:", err);
    throw err;
  }
}

module.exports = { generateAttendanceUsageCSV };