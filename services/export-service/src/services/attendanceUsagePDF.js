// src/services/attendanceUsagePDF.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const pool = require("../utils/db3.js"); // adjust as needed
const { getDateForDay } = require("../utils/dates");

const CHART_WIDTH = 700;
const CHART_HEIGHT = 320;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: CHART_WIDTH, height: CHART_HEIGHT });

function safeNum(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtMinutes(mins){
  const n = safeNum(mins);
  if (n === 0) return "0.0 mins";
  if (n >= 60) {
    const h = Math.floor(n/60);
    const m = Math.round(n % 60);
    return `${h}h ${m}m (${n.toFixed(1)} mins)`;
  }
  return `${n.toFixed(1)} mins`;
}

// Safely embed an image buffer into the PDF (skips invalid/empty buffers)
function safeImage(doc, buffer, options){
  try {
    if (Buffer.isBuffer(buffer) && buffer.length > 100) {
      doc.image(buffer, options || {});
    }
  } catch (err) {
    console.error("PDF image embed error:", err);
  }
}

// Improved table drawer with word wrap and row separation
function drawSimpleTable(doc, headers, rows, startX, startY, totalWidth) {
  const colWidths = [];
  const minColWidth = 80;
  const maxColWidth = Math.floor(totalWidth / headers.length);
  headers.forEach((h, i) => {
    let maxLen = h.length;
    for (let r of rows) {
      if (r[h] && String(r[h]).length > maxLen) maxLen = String(r[h]).length;
    }
    colWidths[i] = Math.max(minColWidth, Math.min(maxColWidth, maxLen * 7));
  });

  // Draw header
  const headerY = startY;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.fillColor("#0b4b8a");
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 4, headerY + 6, { width: colWidths[i] - 8, align: "left" });
    x += colWidths[i];
  });
  doc.moveTo(startX, headerY + 24).lineTo(startX + totalWidth, headerY + 24).stroke();

  // Draw rows
  doc.font("Helvetica").fontSize(10);
  let y = headerY + 28;
  rows.forEach((r, idx) => {
    x = startX;
    let rowHeights = headers.map((h, i) => {
      return doc.heightOfString(String(r[h] ?? ""), { width: colWidths[i] - 8, align: "left" });
    });
    let thisRowHeight = Math.max(...rowHeights) + 8;
    headers.forEach((h, i) => {
      doc.fillColor("#000");
      doc.text(String(r[h] ?? ""), x + 4, y, { width: colWidths[i] - 8, align: "left" });
      x += colWidths[i];
    });
    y += thisRowHeight;
    doc.moveTo(startX, y - 2).lineTo(startX + totalWidth, y - 2).strokeColor("#e0e0e0").stroke();
    doc.strokeColor("#000000");
    if (y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      // Redraw header at fixed position on new page
      const newHeaderY = doc.page.margins.top;
      doc.font("Helvetica-Bold").fontSize(10);
      doc.fillColor("#0b4b8a");
      x = startX;
      headers.forEach((h, i) => {
        doc.text(h, x + 4, newHeaderY + 6, { width: colWidths[i] - 8, align: "left" });
        x += colWidths[i];
      });
      doc.moveTo(startX, newHeaderY + 24).lineTo(startX + totalWidth, newHeaderY + 24).stroke();
      doc.font("Helvetica").fontSize(10);
      y = newHeaderY + 28;
    }
  });
  return y;
}

async function generateAttendanceUsagePDF({ day } = {}) {
  try {
    // Optional date filter derived from exhibition start (2025-09-10 .. 2025-09-14)
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
      SELECT SUBSTRING(building_id,1,1) AS zone, COUNT(*)::int AS visits
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

    // Build metrics rows for table
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

    // Charts data
    const barLabels = totalVisits.map(r => r.dept_name);
    const barValues = totalVisits.map(r => safeNum(r.visits));
    const slotLabels = slotVisits.map(r => r.slot);
    const slotValues = slotVisits.map(r => safeNum(r.visits));
    const zoneLabels = zoneHeat.map(r => r.zone);
    const zoneValues = zoneHeat.map(r => safeNum(r.visits));
    const hourLabels = peakHour.map(r => `${r.hour}:00`);
    const hourValues = peakHour.map(r => safeNum(r.entries));

    // ---- Chart generation ----
    // Use color palettes for clarity
    const palette = [
      "#1976d2", "#388e3c", "#fbc02d", "#d32f2f", "#7b1fa2", "#0288d1", "#c2185b", "#ffa000", "#388e3c", "#455a64"
    ];
    let barBuffer = null, slotBuffer = null, zoneBuffer = null, hourBuffer = null;
    try {
      if (barLabels.length) {
        barBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: barLabels,
            datasets: [{
              label: "Total Visits",
              data: barValues,
              backgroundColor: palette,
              borderColor: "#0b4b8a",
              borderWidth: 1
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: true, position: "top" },
              title: { display: true, text: "Total Visits by Building" }
            },
            scales: {
              x: { title: { display: true, text: "Building" }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 20 } },
              y: { title: { display: true, text: "Visits" }, beginAtZero: true }
            }
          }
        });
      }
      if (slotLabels.length) {
        slotBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: slotLabels,
            datasets: [{
              label: "Visits by Time Slot",
              data: slotValues,
              backgroundColor: ["#1976d2", "#388e3c", "#fbc02d", "#d32f2f", "#bdbdbd"],
              borderColor: "#0b4b8a",
              borderWidth: 1
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: true, position: "top" },
              title: { display: true, text: "Visits by Time Slot (8am-4pm)" }
            },
            scales: {
              x: { title: { display: true, text: "Time Slot" } },
              y: { title: { display: true, text: "Visits" }, beginAtZero: true }
            }
          }
        });
      }
      if (zoneLabels.length) {
        zoneBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "pie",
          data: {
            labels: zoneLabels,
            datasets: [{
              data: zoneValues,
              backgroundColor: palette.slice(0, zoneLabels.length)
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: true, position: "right" },
              title: { display: true, text: "Visits by Zone" }
            }
          }
        });
      }
      if (hourLabels.length) {
        hourBuffer = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: hourLabels,
            datasets: [{
              label: "Entries by Hour",
              data: hourValues,
              backgroundColor: "#1976d2",
              borderColor: "#0b4b8a",
              borderWidth: 1
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: true, position: "top" },
              title: { display: true, text: "Entries by Hour (24h)" }
            },
            scales: {
              x: { title: { display: true, text: "Hour of Day" } },
              y: { title: { display: true, text: "Entries" }, beginAtZero: true }
            }
          }
        });
      }
    } catch(err){
      console.error("Chart render error:", err);
    }

    // ---- Build PDF ----
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `attendance_usage${day ? `_day${day}` : ''}_${timestamp}.pdf`;
    const exportsDir = path.resolve(__dirname, "..", "..", "exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const filepath = path.join(exportsDir, filename);
    const tempPath = `${filepath}.part`;

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const stream = fs.createWriteStream(tempPath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor("#0b4b8a").text(`Attendance & Usage Report${day ? ` - Day ${day}` : ''}` , { align: "left" });
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    doc.fontSize(14).fillColor("#0b4b8a").text("Summary", { underline: true });
    doc.moveDown(0.2);
    const summary = [
      `Total buildings reported: ${totalVisits.length}`,
      `Total unique buildings (zone mapped): ${zoneLabels.length}`,
      `Top repeat visitors (sample): ${repeatVisits.slice(0,5).map(r => `${r.tag_id}(${r.visits})`).join(", ") || "N/A"}`
    ];
    doc.fontSize(11).fillColor("#000").list(summary, { bulletRadius: 3 });
    doc.moveDown();

    doc.fontSize(14).fillColor("#0b4b8a").text("Key Metrics by Building", { underline: true });
    doc.moveDown(0.3);

    const headers = [
      "Building", "Building ID", "Total Visits", "Unique Visitors", "Repeat Visits", "Avg Duration", "Peak Entry Hour"
    ];
    drawSimpleTable(doc, headers, metrics, doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right);

    // --- Per-slot building visits ---
    const slotRanges = [
      { label: "10am - 1pm", key: "10-13", color: "#1976d2", desc: "This section visualizes the distribution of visits by building during 10am-1pm." },
      { label: "1pm - 4pm", key: "13-16", color: "#388e3c", desc: "This section visualizes the distribution of visits by building during 1pm-4pm." },
      { label: "4pm - 7pm", key: "16-19", color: "#fbc02d", desc: "This section visualizes the distribution of visits by building during 4pm-7pm." }
    ];

    // Query for each slot
    // Only show buildings present in metrics for the day, and only show slot counts
    const metricBuildingIds = metrics.map(m => m["Building ID"]);
    const slotBuildingData = {};
    for (const slot of slotRanges) {
      const res = await pool.query(`
        SELECT b.dept_name, b.building_id, COUNT(*)::int AS visits
        FROM "EntryExitLog" e
        JOIN "BUILDING" b ON e.building_id = b.building_id
        WHERE 
          ${day ? `DATE(e.entry_time) = $2::date AND` : ''}
          (CASE
            WHEN e.entry_time::time >= '10:00'::time AND e.entry_time::time < '13:00'::time THEN '10-13'
            WHEN e.entry_time::time >= '13:00'::time AND e.entry_time::time < '16:00'::time THEN '13-16'
            WHEN e.entry_time::time >= '16:00'::time AND e.entry_time::time < '19:00'::time THEN '16-19'
            ELSE 'other'
          END) = $1
        GROUP BY b.dept_name, b.building_id
        ORDER BY visits DESC;
      `, day ? [slot.key, filterDate] : [slot.key]);
      // Filter to only buildings in metrics
      slotBuildingData[slot.key] = (res.rows || []).filter(r => metricBuildingIds.includes(r.building_id));
    }

    // Generate a bar chart for each slot
    const slotBarBuffers = {};
    for (const slot of slotRanges) {
      const data = slotBuildingData[slot.key];
      if (data.length) {
        const labels = data.map(r => r.dept_name);
        const values = data.map(r => safeNum(r.visits));
        slotBarBuffers[slot.key] = await chartJSNodeCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Total Visits",
              data: values,
              backgroundColor: slot.color,
              borderColor: "#0b4b8a",
              borderWidth: 1
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: true, position: "top" },
              title: { display: true, text: `Total Visits by Building (${slot.label})` }
            },
            scales: {
              x: { title: { display: true, text: "Building" }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 20 } },
              y: { title: { display: true, text: "Visits" }, beginAtZero: true }
            }
          }
        });
      }
    }

    // --- Visuals Section ---
    for (const slot of slotRanges) {
      if (slotBarBuffers[slot.key]) {
        // Estimate required height for all elements in this slot section
        const data = slotBuildingData[slot.key];
        const headingHeight = 22;
        const descHeight = 18;
        const chartHeight = CHART_HEIGHT / 1.5 + 10;
        const legendHeight = 18;
        const listHeight = data && data.length ? (data.length + 1) * 16 + 20 : 0;
        const totalNeeded = headingHeight + descHeight + chartHeight + legendHeight + listHeight + 40;

        // If not enough space for the whole section, add a page
        if (doc.y + totalNeeded > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }

        // Section heading and description
        doc.fontSize(13).fillColor(slot.color).text(slot.label, { underline: true });
        doc.fontSize(10).fillColor("#000").text(slot.desc);
        doc.moveDown(0.3);

        // Chart
        safeImage(doc, slotBarBuffers[slot.key], { fit: [CHART_WIDTH, CHART_HEIGHT/1.5], align: "center" });
        doc.moveDown(0.2);

        // Legend
        doc.fontSize(9).fillColor("#666").text("Legend: Each bar represents a building. The height shows the total number of visits for this time slot.");
        doc.moveDown(0.3);

        // List of visits by building
        if (data && data.length) {
          doc.fontSize(10).fillColor("#0b4b8a").text("Visits by Building:", { underline: true });
          doc.fontSize(10).fillColor("#000");
          data.forEach(r => {
            // If near page bottom, add a page before printing more lines
            if (doc.y + 18 > doc.page.height - doc.page.margins.bottom) {
              doc.addPage();
            }
            doc.text(`${r.dept_name} - ${r.visits}`);
          });
          doc.moveDown(0.5);
        }
      }
    }

    // --- Add total summary at the end ---
    doc.addPage();
    doc.fontSize(16).fillColor("#0b4b8a").text("Overall Summary", { underline: true });
    doc.moveDown(0.5);

    const slotTotals = slotVisits.filter(s => ["10-13","13-16","16-19"].includes(s.slot));
    const slotLabelsMap = {
      "10-13": "10am - 1pm",
      "13-16": "1pm - 4pm",
      "16-19": "4pm - 7pm"
    };
    const slotColors = ["#1976d2", "#388e3c", "#fbc02d"];

    if (slotTotals.length > 0) {
      let maxSlot = slotTotals[0];
      slotTotals.forEach(s => { if (s.visits > maxSlot.visits) maxSlot = s; });

      // Pie chart for slot distribution
      const pieBuffer = await chartJSNodeCanvas.renderToBuffer({
        type: "pie",
        data: {
          labels: slotTotals.map(s => slotLabelsMap[s.slot]),
          datasets: [{
            data: slotTotals.map(s => s.visits),
            backgroundColor: slotColors
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: true, position: "right" },
            title: { display: true, text: "Proportion of Visits by Time Slot" }
          }
        }
      });

      doc.fontSize(12).fillColor("#000").text(
        `The period with the highest total number of people present is:`,
        { align: "left" }
      );
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor("#1976d2").text(
        `${slotLabelsMap[maxSlot.slot]} (${maxSlot.visits} visits)`,
        { align: "left", underline: true }
      );
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#000").text(
        `This means that the busiest period overall was ${slotLabelsMap[maxSlot.slot]}, with a total of ${maxSlot.visits} visits recorded across all buildings.`
      );
      doc.moveDown(0.5);

      safeImage(doc, pieBuffer, { fit: [400, 250], align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#666").text(
        "Legend: Each slice represents a time slot. The size shows the proportion of visits for that period."
      );
    } else {
      doc.fontSize(12).fillColor("#000").text(
        "No slot distribution data available to summarize.",
        { align: "left" }
      );
    }

    doc.end();

    // Wait for file to finish writing
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    try {
      const stats = fs.statSync(tempPath);
      if (!stats || stats.size === 0) {
        throw new Error(`Export appears empty: ${tempPath}`);
      }
      // Atomic rename to final path
      fs.renameSync(tempPath, filepath);
    } catch (e) {
      throw new Error(`Export not saved correctly at ${tempPath}: ${e.message}`);
    }

    return filepath;
  } catch (err) {
    console.error("Error generating Attendance & Usage PDF:", err);
    throw err;
  }
}

module.exports = { generateAttendanceUsagePDF };
