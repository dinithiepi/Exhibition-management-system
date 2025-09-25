// src/services/movementFlowPDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// app.js or server.js
require('chartjs-chart-matrix');

const pool = require("../utils/db3.js");
const { getDateForDay } = require("../utils/dates");

const CHART_WIDTH = 900;
const CHART_HEIGHT = 420;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT });

function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// 🔹 Zone mapping (fixed according to your request)
const zoneMap = {
  A: ["B22", "B28", "B23", "B24", "B25", "B26", "B27"],
  B: ["B1", "B2", "B3", "B4", "B5", "B6"],
  C: ["B8", "B9", "B10", "B1", "B12", "B13"],
  D: ["B15", "B16", "B17", "B18", "B19", "B20", "B21"],
};

function getZone(buildingId) {
  if (!buildingId) return "Unknown";
  const strId = String(buildingId);
  for (const [zone, ids] of Object.entries(zoneMap)) {
    if (ids.includes(strId)) return zone;
  }
  return "Unknown";
}

async function generateMovementFlowPDF({ day } = {}) {
  try {
    const filterDate = day ? getDateForDay(day) : null;
    const params = filterDate ? [filterDate] : [];

    // ---- Queries ----
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

    const rawTransitionsRes = await pool.query(`
      WITH ordered AS (
        SELECT tag_id, building_id, entry_time,
               ROW_NUMBER() OVER (PARTITION BY tag_id ORDER BY entry_time) rn
        FROM "EntryExitLog"
        WHERE entry_time IS NOT NULL
        ${day ? 'AND DATE(entry_time) = $1::date' : ''}
      ),
      pairs AS (
        SELECT a.tag_id,
               a.building_id AS from_building,
               b.building_id AS to_building
        FROM ordered a
        JOIN ordered b ON a.tag_id = b.tag_id AND b.rn = a.rn + 1
        WHERE a.building_id IS NOT NULL AND b.building_id IS NOT NULL
      )
      SELECT from_building, to_building, COUNT(*)::int AS transitions
      FROM pairs
      GROUP BY from_building, to_building
      ORDER BY transitions DESC
      LIMIT 200;
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

    const rawZonesRes = await pool.query(`
      SELECT tag_id, building_id
      FROM "EntryExitLog"
      WHERE building_id IS NOT NULL
      ${day ? 'AND DATE(entry_time) = $1::date' : ''}
    `, params);

    const avgBuildingsPerPersonRes = await pool.query(`
      SELECT AVG(cnt)::numeric(10,2) AS avg_buildings
      FROM (
        SELECT tag_id, COUNT(DISTINCT building_id) AS cnt
        FROM "EntryExitLog"
        GROUP BY tag_id
      ) t;
    `);

    // ---- Prepare data ----
    const entryExitSlots = entryExitSlotsRes.rows || [];

    // 🔹 Convert transitions to zones
    const transitions = rawTransitionsRes.rows.map(r => ({
      from_zone: getZone(r.from_building),
      to_zone: getZone(r.to_building),
      transitions: r.transitions
    }));

    const busiestBuildings = busiestBuildingsRes.rows || [];

    // 🔹 Zone aggregation
    const zoneCounts = {};
    for (const row of rawZonesRes.rows) {
      const z = getZone(row.building_id);
      if (!zoneCounts[z]) zoneCounts[z] = new Set();
      zoneCounts[z].add(row.tag_id);
    }
    const busiestZones = Object.entries(zoneCounts).map(([zone, set]) => ({
      zone,
      unique_visitors: set.size
    }));

    const avgBuildingsPerPerson = avgBuildingsPerPersonRes.rows[0]
      ? Number(avgBuildingsPerPersonRes.rows[0].avg_buildings)
      : 0;

    // charts data
    const slotLabels = entryExitSlots.map(r => r.slot);
    const slotEntries = entryExitSlots.map(r => safeNum(r.entries));
    const slotExits = entryExitSlots.map(r => safeNum(r.exits));
    const transitionLabels = transitions.map(r => `${r.from_zone}->${r.to_zone}`);
    const transitionValues = transitions.map(r => safeNum(r.transitions));
    const busiestBuildingLabels = busiestBuildings.map(r => r.dept_name);
    const busiestBuildingValues = busiestBuildings.map(r => safeNum(r.entries));
    const busiestZoneLabels = busiestZones.map(r => r.zone);
    const busiestZoneValues = busiestZones.map(r => safeNum(r.unique_visitors));

    // ---- Chart rendering ----
    let slotBuffer = null, transitionBuffer = null, busiestBuffer = null, zoneBuffer = null, avgBuffer = null, heatmapBuffer = null;
    try {
      if (slotLabels.length) {
        slotBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: slotLabels,
            datasets: [
              { label: "Entries", data: slotEntries, backgroundColor: "#4e79a7" },
              { label: "Exits", data: slotExits, backgroundColor: "#f28e2b" }
            ]
          },
          options: { responsive: false }
        });
      }
      if (transitionLabels.length) {
        transitionBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: transitionLabels, datasets: [{ label: "Transitions", data: transitionValues, backgroundColor: "#76b7b2" }] },
          options: { responsive: false, plugins: { legend: { display: false } } }
        });
      }
      if (busiestBuildingLabels.length) {
        busiestBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: { labels: busiestBuildingLabels, datasets: [{ label: "Entries", data: busiestBuildingValues, backgroundColor: "#59a14f" }] },
          options: { responsive: false }
        });
      }
      if (busiestZoneLabels.length) {
        zoneBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "pie",
          data: {
            labels: busiestZoneLabels,
            datasets: [{
              label: "Unique Visitors",
              data: busiestZoneValues,
              backgroundColor: ["#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]
            }]
          },
          options: { responsive: false }
        });
      }
      if (avgBuildingsPerPerson > 0) {
        avgBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: ["Average Buildings Visited"],
            datasets: [{
              label: "Avg Buildings",
              data: [avgBuildingsPerPerson],
              backgroundColor: "#e15759"
            }]
          },
          options: { indexAxis: "y", responsive: false, plugins: { legend: { display: false } } }
        });
      }
    } catch (err) {
      console.error("Chart render error:", err);
    }

    // ---- Build PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `movement_flow_${timestamp}.pdf`;
    const exportsDir = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).fillColor("#0b4b8a").text("Movement & Flow Analytics Report", { align: "left" });
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    // ---- KPI BLOCKS ----
    const totalEntries = slotEntries.reduce((a, b) => a + b, 0);
    const totalExits = slotExits.reduce((a, b) => a + b, 0);
    const topZone = busiestZones.length ? busiestZones[0] : null;
    const topBuilding = busiestBuildings.length ? busiestBuildings[0] : null;

    const boxWidth = 200, boxHeight = 80, gap = 30;
    function drawKPI(x, y, title, value) {
      doc.rect(x, y, boxWidth, boxHeight).fillColor("#f2f6fc").fill()
        .strokeColor("#0b4b8a").lineWidth(1).stroke();
      doc.fillColor("#0b4b8a").fontSize(11).text(title, x + 5, y + 8, { width: boxWidth - 10, align: "center" });
      const valueStr = String(value);
      const fontSize = valueStr.length > 15 ? 13 : valueStr.length > 10 ? 16 : 22;
      doc.fontSize(fontSize).fillColor("#000").text(valueStr, x + 5, y + 30, { width: boxWidth - 10, align: "center" });
    }

    drawKPI(50, 100, "Total Entries", totalEntries);
    drawKPI(280, 100, "Total Exits", totalExits);
    drawKPI(510, 100, "Avg Buildings / Person", avgBuildingsPerPerson);
    if (topZone) drawKPI(50, 210, "Most Visited Zone", `${topZone.zone} (${topZone.unique_visitors})`);
    if (topBuilding) drawKPI(280, 210, "Top Building", `${topBuilding.dept_name} (${topBuilding.entries})`);

    // ---- Entry vs Exit Trends (side by side layout) ----
    if (slotBuffer) {
      doc.addPage();
      doc.fontSize(14).fillColor("#0b4b8a")
        .text("Entry vs Exit Trends (per time slot)", { underline: true });

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / 2;
      const topY = doc.y + 10;

      doc.image(slotBuffer, doc.page.margins.left, topY, { fit: [colWidth - 20, 250], align: "left" });

      let textX = doc.page.margins.left + colWidth + 10;
      let textY = topY;
      doc.fontSize(11).fillColor("#333").text("Slot Values:", textX, textY, { underline: true });
      textY += 20;

      entryExitSlots.forEach(r => {
        const line = `${r.slot} - Entries: ${r.entries}, Exits: ${r.exits}`;
        if (textY > topY + 250) {
          textX = doc.page.margins.left;
          textY = topY + 270;
        }
        doc.text(line, textX, textY, { width: colWidth - 20 });
        textY += 15;
      });

      const blockBottom = Math.max(topY + 250, textY);
      doc.fontSize(10).fillColor("#555").text(
        "Counts are grouped into 3-hour slots.",
        doc.page.margins.left,
        blockBottom + 10,
        { align: "center", width: pageWidth }
      );
    }

    // ---- Busiest Buildings (side by side layout) ----
    if (busiestBuffer) {
      doc.addPage();
      doc.fontSize(14).fillColor("#0b4b8a").text("Busiest Buildings by Entry Count", { underline: true });
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / 2;
      const topY = doc.y + 10;
      doc.image(busiestBuffer, doc.page.margins.left, topY, { fit: [colWidth - 20, 250], align: "left" });
      let textX = doc.page.margins.left + colWidth + 10;
      let textY = topY;
      doc.fontSize(11).fillColor("#333").text("Building Entry Counts:", textX, textY, { underline: true });
      textY += 20;
      busiestBuildings.forEach(r => {
        const line = `${r.dept_name} (${r.building_id}) - ${r.entries} entries`;
        if (textY > topY + 250) { textX = doc.page.margins.left; textY = topY + 270; }
        doc.text(line, textX, textY, { width: colWidth - 20 }); textY += 15;
      });
      doc.fontSize(10).fillColor("#555").text("Shows which departments/buildings have the highest number of entries.",
        doc.page.margins.left, textY + 10, { align: "center", width: pageWidth });
    }

    // ---- Busiest Zones (pie + % list under) ----
    if (zoneBuffer) {
      doc.addPage();
      doc.fontSize(14).fillColor("#0b4b8a").text("Busiest Zones by Unique Visitors", { underline: true });
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const topY = doc.y + 10;
      doc.image(zoneBuffer, doc.page.margins.left + 50, topY, { fit: [400, 250], align: "center" });
      const totalVisitors = busiestZoneValues.reduce((a, b) => a + b, 0);
      let textY = topY + 270;
      doc.fontSize(11).fillColor("#333").text("Zone Percentages:", doc.page.margins.left, textY, { underline: true });
      textY += 20;
      busiestZones.forEach(z => {
        const perc = ((z.unique_visitors / totalVisitors) * 100).toFixed(1);
        doc.text(`${z.zone}: ${z.unique_visitors} (${perc}%)`, doc.page.margins.left, textY); textY += 15;
      });
      doc.fontSize(10).fillColor("#555").text("Shows zones with unique visitor distribution (with % values).",
        doc.page.margins.left, textY + 10, { align: "center", width: pageWidth });
    }

    // ---- Average Buildings per Person ----
    if (avgBuffer) {
      doc.addPage();
      doc.fontSize(14).fillColor("#0b4b8a").text("Average Buildings Visited per Person", { underline: true });
      doc.image(avgBuffer, { fit: [400, 150], align: "center" });
      doc.fontSize(12).fillColor("#333").text(
        `On average, each person visits ${avgBuildingsPerPerson} distinct buildings.\nThis is calculated as the average number of unique building_id values per tag_id.`
      );
    }

    doc.end();
    await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
    return filepath;
  } catch (err) {
    console.error("Error generating Movement & Flow PDF:", err);
    throw err;
  }
}

module.exports = { generateMovementFlowPDF };
