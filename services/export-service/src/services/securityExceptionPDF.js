// src/services/securityExceptionPDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { loadImage } = require("canvas");
const pool = require("../utils/db3.js"); // adjust as needed
const { getDateForDay } = require("../utils/dates");

const CHART_WIDTH = 900;
const CHART_HEIGHT = 420;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT });

function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtDate(ts) { if (!ts) return ""; return new Date(ts).toLocaleString(); }

async function generateSecurityExceptionPDF(options = {}) {
  try {
    const { day } = options;
    const filterDate = day ? getDateForDay(day) : null;
    const params = filterDate ? [filterDate] : [];
    // ---- Thresholds & restricted defaults ----
    const overstayMinutes = options.overstayMinutes || 240; // 4h
    const congestionThreshold = options.congestionThreshold || 5;
    const restrictedList = options.restrictedList || ["B1", "B2"];

    // ---- Queries ----
    const afterHoursRes = await pool.query(`
      SELECT tag_id, building_id, entry_time
      FROM "EntryExitLog"
      WHERE NOT (
        (entry_time::time >= '10:00' AND entry_time::time < '13:00')
        OR (entry_time::time >= '13:00' AND entry_time::time < '16:00')
        OR (entry_time::time >= '16:00' AND entry_time::time < '19:00')
      )
      ${filterDate ? 'AND DATE(entry_time) = $1::date' : ''}
      ORDER BY entry_time DESC
      LIMIT 200;
    `, params);

    const overstayRes = await pool.query(`
      SELECT tag_id, building_id, entry_time, exit_time,
             EXTRACT(EPOCH FROM (exit_time - entry_time))/60 AS minutes
      FROM "EntryExitLog"
      WHERE exit_time IS NOT NULL
        AND EXTRACT(EPOCH FROM (exit_time - entry_time))/60 > $1
        ${day ? 'AND DATE(entry_time) = $2::date' : ''}
      ORDER BY minutes DESC
      LIMIT 200;
    `, filterDate ? [overstayMinutes, filterDate] : [overstayMinutes]);

    const missingExitRes = await pool.query(`
      SELECT tag_id, building_id, entry_time
      FROM "EntryExitLog"
      WHERE exit_time IS NULL
      ${filterDate ? 'AND DATE(entry_time) = $1::date' : ''}
      ORDER BY entry_time DESC
      LIMIT 200;
    `, params);

    const restrictedRes = await pool.query(`
      SELECT e.tag_id, e.building_id, b.dept_name, e.entry_time
      FROM "EntryExitLog" e
      LEFT JOIN "BUILDING" b ON e.building_id = b.building_id
      WHERE e.building_id = ANY($1)
      ${filterDate ? 'AND DATE(e.entry_time) = $2::date' : ''}
      ORDER BY e.entry_time DESC
      LIMIT 200;
    `, filterDate ? [restrictedList, filterDate] : [restrictedList]);

    const restrictedNamesRes = await pool.query(`
      SELECT building_id, dept_name
      FROM "BUILDING"
      WHERE building_id = ANY($1);
    `, [restrictedList]);

    const restrictedNames = (restrictedNamesRes.rows || [])
      .map(r => `${r.building_id} (${r.dept_name})`).join(", ");

    const afterHoursByBuildingRes = await pool.query(`
      SELECT b.dept_name, e.building_id,
        CASE
          WHEN e.entry_time::time >= '10:00' AND e.entry_time::time < '13:00' THEN '10-13'
          WHEN e.entry_time::time >= '13:00' AND e.entry_time::time < '16:00' THEN '13-16'
          WHEN e.entry_time::time >= '16:00' AND e.entry_time::time < '19:00' THEN '16-19'
          ELSE 'other'
        END AS slot,
        COUNT(*)::int AS entries
      FROM "EntryExitLog" e
      LEFT JOIN "BUILDING" b ON e.building_id = b.building_id
      ${filterDate ? 'WHERE DATE(e.entry_time) = $1::date' : ''}
      GROUP BY b.dept_name, e.building_id, slot
      ORDER BY entries DESC
      LIMIT 50;
    `, params);

    const congestionRes = await pool.query(`
      SELECT building_id, slot, COUNT(*)::int AS cnt
      FROM (
        SELECT building_id,
         CASE
           WHEN entry_time::time >= '10:00' AND entry_time::time < '13:00' THEN '10-13'
           WHEN entry_time::time >= '13:00' AND entry_time::time < '16:00' THEN '13-16'
           WHEN entry_time::time >= '16:00' AND entry_time::time < '19:00' THEN '16-19'
           ELSE 'other'
         END AS slot
        FROM "EntryExitLog"
        WHERE building_id IS NOT NULL
        ${filterDate ? 'AND DATE(entry_time) = $2::date' : ''}
      ) s
      GROUP BY building_id, slot
      HAVING COUNT(*) >= $1
      ORDER BY cnt DESC
      LIMIT 200;
    `, filterDate ? [congestionThreshold, filterDate] : [congestionThreshold]);

    // ---- Prepare results ----
    const afterHours = afterHoursRes.rows || [];
    const overstays = overstayRes.rows || [];
    const missingExits = missingExitRes.rows || [];
    const restricted = restrictedRes.rows || [];
    const afterHoursByBuilding = afterHoursByBuildingRes.rows || [];
    const congestion = congestionRes.rows || [];

    // ---- Charts ----
    const afterBuildingLabels = afterHoursByBuilding.map(r => `${r.dept_name} (${r.slot})`);
    const afterBuildingValues = afterHoursByBuilding.map(r => safeNum(r.entries));
    const overstayLabels = overstays.map(r => String(r.tag_id)).slice(0, 30);
    const overstayValues = overstays.map(r => safeNum(r.minutes)).slice(0, 30);

    let afterBuffer = null, overstayBuffer = null;
    try {
      if (afterBuildingLabels.length) {
        afterBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: afterBuildingLabels, datasets: [{ data: afterBuildingValues, backgroundColor: "#1e88e5" }] },
          options: { responsive: false, plugins: { legend: { display: false } } }
        });
      }
      if (overstayLabels.length) {
        overstayBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: overstayLabels, datasets: [{ data: overstayValues, backgroundColor: "#e53935" }] },
          options: { responsive: false, plugins: { legend: { display: false } } }
        });
      }
    } catch (err) {
      console.error("Chart render error:", err);
    }

    // ---- Build PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `security_exception_${timestamp}.pdf`;
    const exportsDir = path.resolve(__dirname, "..", "..", "exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);
    const tempPath = `${filepath}.part`;

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(tempPath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).fillColor("#b71c1c").text("Security & Exception Report", { align: "left" });
    doc.fontSize(10).fillColor("black").text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    // Summary
    doc.fontSize(14).fillColor("#b71c1c").text("Summary (thresholds)", { underline: true });
    doc.moveDown(0.2);
    const summary = [
      `Overstay threshold: ${overstayMinutes} minutes`,
      `Congestion threshold (entries per building per slot): ${congestionThreshold}`,
      `Restricted buildings: ${restrictedNames || restrictedList.join(", ")}`
    ];
    doc.fontSize(11).fillColor("black").list(summary, { bulletRadius: 3 });
    doc.moveDown();

    // Sections
    doc.fontSize(12).fillColor("#b71c1c").text("After-hours Entries (recent)", { underline: true });
    if (afterHours.length === 0) {
      doc.fontSize(10).fillColor("black").text("No after-hours entries for the selected day.");
    } else {
      afterHours.slice(0, 100).forEach(r => {
        doc.fontSize(10).fillColor("black").text(`tag:${r.tag_id} | building:${r.building_id} | entry:${fmtDate(r.entry_time)}`);
      });
    }
    doc.addPage();

    doc.fontSize(12).fillColor("#b71c1c").text("Overstays (long durations)", { underline: true });
    if (overstays.length === 0) {
      doc.fontSize(10).fillColor("black").text("No overstays exceeded the threshold.");
    } else {
      overstays.slice(0, 100).forEach(r => {
        doc.fontSize(10).fillColor("black").text(`tag:${r.tag_id} | b:${r.building_id} | in:${fmtDate(r.entry_time)} | out:${fmtDate(r.exit_time)} | ${Math.round(r.minutes)} mins`);
      });
    }
    if (overstayBuffer) {
      doc.moveDown(0.5);
      doc.image(overstayBuffer, { fit: [700, 240], align: "center" });
    }
    doc.addPage();

    doc.fontSize(12).fillColor("#b71c1c").text("Missing Exits (currently open sessions)", { underline: true });
    if (missingExits.length === 0) {
      doc.fontSize(10).fillColor("black").text("No sessions without exit detected.");
    } else {
      missingExits.slice(0, 200).forEach(r => {
        doc.fontSize(10).fillColor("black").text(`tag:${r.tag_id} | building:${r.building_id} | entry:${fmtDate(r.entry_time)}`);
      });
    }
    doc.addPage();

    doc.fontSize(12).fillColor("#b71c1c").text("Restricted Building Entries", { underline: true });
    if (restricted.length === 0) {
      doc.fontSize(10).fillColor("black").text("No entries to restricted buildings.");
    } else {
      restricted.slice(0, 200).forEach(r => {
        const name = r.dept_name ? `${r.building_id} (${r.dept_name})` : r.building_id;
        doc.fontSize(10).fillColor("black").text(`tag:${r.tag_id} | building:${name} | entry:${fmtDate(r.entry_time)}`);
      });
    }
    doc.addPage();

    doc.fontSize(12).fillColor("#b71c1c").text("After-hours Entries by Building (slots)", { underline: true });
    if (afterHoursByBuilding.length === 0) {
      doc.fontSize(10).fillColor("black").text("No after-hours entries aggregated by building.");
    } else {
      afterHoursByBuilding.slice(0, 200).forEach(r => {
        doc.fontSize(10).fillColor("black").text(`building:${r.dept_name || r.building_id} | slot:${r.slot} | entries:${r.entries}`);
      });
    }
    if (afterBuffer) {
      doc.moveDown(0.5);
      doc.image(afterBuffer, { fit: [700, 240], align: "center" });
    }
    doc.addPage();

    doc.fontSize(12).fillColor("#b71c1c").text("Congestion Alerts (building & slot)", { underline: true });
    if (congestion.length === 0) {
      doc.fontSize(10).fillColor("black").text("No congestion alerts for the selected threshold.");
    } else {
      congestion.slice(0, 200).forEach(r => {
        doc.fontSize(10).fillColor("black").text(`building:${r.building_id} | slot:${r.slot} | entries:${r.cnt}`);
      });
    }

    // ---- Faculty Map Section ----
    doc.addPage();
    doc.fontSize(12).fillColor("#b71c1c").text("Faculty Map (Visual Reference)", { underline: true });
    doc.moveDown(0.5);

    try {
      const mapPath = path.join(__dirname, "faculty_map.jpg"); // <-- place your image here
      if (fs.existsSync(mapPath)) {
        doc.image(mapPath, { fit: [750, 500], align: "center" });
      } else {
        doc.fillColor("red").text("Faculty map image not found.");
      }
    } catch (err) {
      console.error("Image render error:", err);
      doc.fillColor("red").text("Map image could not be displayed.");
    }

    // Finish
    doc.end();
    await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });

    try {
      const stats = fs.statSync(tempPath);
      if (!stats || stats.size === 0) {
        throw new Error(`Export appears empty: ${tempPath}`);
      }
      fs.renameSync(tempPath, filepath);
    } catch (e) {
      throw new Error(`Export not saved correctly at ${tempPath}: ${e.message}`);
    }

    return filepath;
  } catch (err) {
    console.error("Error generating Security & Exception PDF:", err);
    throw err;
  }
}

module.exports = { generateSecurityExceptionPDF };
