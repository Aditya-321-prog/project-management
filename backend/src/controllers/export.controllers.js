import PDFDocument from "pdfkit";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { dueDateKey, localDateKey } from "../utils/date.js";
import { logActivity } from "../utils/logActivity.js";
import { buildProjectAnalytics, normalizeRange } from "./analytics.controllers.js";

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

const STATUS_COLORS = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  in_review: "#eab308",
  completed: "#22c55e",
};

const PRIORITY_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

const personName = (u) => (u ? u.fullName || u.username : "");

// Date ko "19 Sep 2026" jaisa
const prettyDate = (value, { dueDate = false } = {}) => {
  if (!value) return "";
  const key = dueDate ? dueDateKey(value) : localDateKey(value);
  const [y, m, d] = key.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
};

// File ke naam me sirf safe characters
const safeFileName = (name) =>
  (name || "project").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "project";

const loadExportData = async (projectId, range) => {
  const [project, tasks, analytics] = await Promise.all([
    Project.findById(projectId).populate("createdBy", "username fullName").lean(),
    Task.find({ project: projectId })
      .select("title description status priority dueDate assignedTo assignedBy createdAt updatedAt completedAt links attachments")
      .populate("assignedTo", "username fullName")
      .populate("assignedBy", "username fullName")
      .sort({ createdAt: -1 })
      .lean(),
    buildProjectAnalytics(projectId, range),
  ]);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const today = localDateKey();
  const rows = tasks.map((t) => {
    const done = t.status === "completed";
    const dueKey = t.dueDate ? dueDateKey(t.dueDate) : null;
    return {
      ...t,
      isOverdue: !done && dueKey !== null && dueKey < today,
      completedOn: done ? t.completedAt || t.updatedAt : null,
    };
  });

  return { project, tasks: rows, analytics };
};

// ==========================================================
// CSV
// ==========================================================

// Comma, quote ya nayi line ho to "..." me lapet do.
// "=", "+", "-", "@" se shuru hone wali cell Excel formula ban sakti hai
// (CSV injection) - uske aage ' laga do.
const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

const buildCsv = ({ tasks }) => {
  const header = [
    "Title",
    "Status",
    "Priority",
    "Assigned To",
    "Assigned By",
    "Due Date",
    "Overdue",
    "Created On",
    "Completed On",
    "Links",
    "Attachments",
    "Description",
  ];

  const lines = tasks.map((t) =>
    [
      t.title,
      STATUS_LABELS[t.status] || t.status,
      t.priority,
      personName(t.assignedTo) || "Unassigned",
      personName(t.assignedBy),
      prettyDate(t.dueDate, { dueDate: true }),
      t.isOverdue ? "Yes" : "No",
      prettyDate(t.createdAt),
      prettyDate(t.completedOn),
      (t.links || []).map((l) => l.url).join(" | "),
      (t.attachments || []).length,
      t.description || "",
    ]
      .map(csvCell)
      .join(","),
  );

  // \uFEFF (BOM) se Excel Hindi / special characters sahi dikhata hai
  return `\uFEFF${[header.join(","), ...lines].join("\r\n")}`;
};

// ==========================================================
// PDF
// ==========================================================

// PDF ke built-in font me emoji / Devanagari nahi hote - unhe hata do
// taaki ajeeb symbols na chhapein
const pdfText = (value) =>
  String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
    .trim();

const COLORS = {
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f8fafc",
  brand: "#2563eb",
  red: "#dc2626",
};

const buildPdf = (doc, { project, tasks, analytics }) => {
  const { summary, statusBreakdown, priorityBreakdown, members, range } = analytics;
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 20;

  const ensureSpace = (needed) => {
    if (doc.y + needed > bottomLimit()) doc.addPage();
  };

  const sectionTitle = (text) => {
    ensureSpace(40);
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink).text(text, left, doc.y);
    doc.moveTo(left, doc.y + 3).lineTo(left + width, doc.y + 3).lineWidth(1).strokeColor(COLORS.line).stroke();
    doc.moveDown(0.7);
  };

  // Lamba text column me fit na ho to "..." laga do
  const fit = (text, maxWidth) => {
    let t = pdfText(text);
    if (doc.widthOfString(t) <= maxWidth) return t;
    while (t.length > 1 && doc.widthOfString(`${t}...`) > maxWidth) t = t.slice(0, -1);
    return `${t}...`;
  };

  // Simple table (naye page par header dobara)
  const table = (columns, rows, { rowColor } = {}) => {
    const rowH = 20;
    const drawHeader = () => {
      const y = doc.y;
      doc.rect(left, y, width, rowH).fill(COLORS.ink);
      let x = left;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
      columns.forEach((c) => {
        doc.text(c.label, x + 6, y + 6, { width: c.width - 12, lineBreak: false });
        x += c.width;
      });
      doc.y = y + rowH;
    };

    ensureSpace(rowH * 2);
    drawHeader();

    rows.forEach((row, index) => {
      if (doc.y + rowH > bottomLimit()) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (index % 2 === 1) doc.rect(left, y, width, rowH).fill(COLORS.soft);

      let x = left;
      doc.font("Helvetica").fontSize(8.5);
      columns.forEach((c) => {
        const value = c.value(row);
        doc.fillColor((rowColor && rowColor(row, c)) || COLORS.ink);
        doc.text(fit(value, c.width - 12), x + 6, y + 6, { width: c.width - 12, lineBreak: false });
        x += c.width;
      });

      doc.moveTo(left, y + rowH).lineTo(left + width, y + rowH).lineWidth(0.5).strokeColor(COLORS.line).stroke();
      doc.y = y + rowH;
    });
    doc.x = left;
  };

  // ---------- Header band ----------
  doc.rect(0, 0, doc.page.width, 110).fill(COLORS.brand);
  doc.fillColor("#ffffff").font("Helvetica").fontSize(10).text("PROJECT REPORT", left, 28, { characterSpacing: 2 });
  doc.font("Helvetica-Bold").fontSize(22).text(fit(project.name, width), left, 44, { width, lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#dbeafe")
    .text(
      `Generated ${prettyDate(new Date())}  |  Last ${range} days  |  Owner: ${pdfText(personName(project.createdBy)) || "-"}`,
      left,
      78,
    );

  doc.y = 130;
  doc.x = left;

  if (project.description) {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(pdfText(project.description), left, doc.y, { width });
    doc.moveDown(0.5);
  }

  // ---------- Summary cards (4 x 2) ----------
  sectionTitle("Summary");
  const cards = [
    ["Total tasks", summary.total],
    ["Completed", `${summary.completed} (${summary.completionRate}%)`],
    ["Overdue", summary.overdue, summary.overdue > 0 ? COLORS.red : null],
    ["Due this week", summary.dueThisWeek],
    [`Completed (${range}d)`, summary.completedInRange],
    [`Created (${range}d)`, summary.createdInRange],
    ["On-time rate", summary.onTimeRate === null ? "-" : `${summary.onTimeRate}%`],
    ["Avg. days to finish", summary.avgDaysToComplete ?? "-"],
  ];
  const gap = 10;
  const cardW = (width - gap * 3) / 4;
  const cardH = 52;
  ensureSpace(cardH * 2 + gap + 10);
  const cardsTop = doc.y;
  cards.forEach(([label, value, color], i) => {
    const x = left + (i % 4) * (cardW + gap);
    const y = cardsTop + Math.floor(i / 4) * (cardH + gap);
    doc.roundedRect(x, y, cardW, cardH, 6).fillAndStroke(COLORS.soft, COLORS.line);
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(label, x + 10, y + 10, { width: cardW - 20 });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(color || COLORS.ink).text(String(value), x + 10, y + 24, { width: cardW - 20 });
  });
  doc.y = cardsTop + cardH * 2 + gap + 6;
  doc.x = left;

  // ---------- Status bar ----------
  sectionTitle("Tasks by status");
  const statusTotal = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
  const barY = doc.y;
  if (statusTotal > 0) {
    let x = left;
    Object.entries(statusBreakdown).forEach(([key, count]) => {
      if (!count) return;
      const w = (count / statusTotal) * width;
      doc.rect(x, barY, w, 14).fill(STATUS_COLORS[key]);
      x += w;
    });
  } else {
    doc.rect(left, barY, width, 14).fill(COLORS.line);
  }
  doc.y = barY + 22;
  let legendX = left;
  Object.entries(statusBreakdown).forEach(([key, count]) => {
    doc.rect(legendX, doc.y + 1, 8, 8).fill(STATUS_COLORS[key]);
    const label = `${STATUS_LABELS[key]}: ${count}`;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink).text(label, legendX + 12, doc.y, { lineBreak: false });
    legendX += 12 + doc.widthOfString(label) + 20;
  });
  doc.y += 16;

  // ---------- Priority ----------
  sectionTitle("Open tasks by priority");
  const maxP = Math.max(1, ...Object.values(priorityBreakdown));
  Object.entries(priorityBreakdown).forEach(([key, count]) => {
    ensureSpace(20);
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink).text(key[0].toUpperCase() + key.slice(1), left, y + 2, { width: 60 });
    const barW = ((width - 110) * count) / maxP;
    doc.rect(left + 60, y, width - 110, 12).fill(COLORS.soft);
    if (count) doc.rect(left + 60, y, barW, 12).fill(PRIORITY_COLORS[key]);
    doc.fillColor(COLORS.ink).text(String(count), left + width - 40, y + 2, { width: 40, align: "right" });
    doc.y = y + 18;
  });

  // ---------- Team ----------
  if (members.length) {
    sectionTitle("Team performance");
    table(
      [
        { label: "Member", width: width * 0.28, value: (m) => `${personName(m.user)} (${m.role})` },
        { label: "Assigned", width: width * 0.12, value: (m) => m.assigned },
        { label: "Completed", width: width * 0.13, value: (m) => m.completed },
        { label: `Done ${range}d`, width: width * 0.12, value: (m) => m.completedInRange },
        { label: "Overdue", width: width * 0.11, value: (m) => m.overdue },
        { label: "On-time", width: width * 0.12, value: (m) => (m.onTimeRate === null ? "-" : `${m.onTimeRate}%`) },
        { label: "Done %", width: width * 0.12, value: (m) => `${m.completionRate}%` },
      ],
      members,
      { rowColor: (m, c) => (c.label === "Overdue" && m.overdue > 0 ? COLORS.red : null) },
    );
  }

  // ---------- Overdue ----------
  const overdue = tasks.filter((t) => t.isOverdue);
  if (overdue.length) {
    sectionTitle(`Overdue tasks (${overdue.length})`);
    table(
      [
        { label: "Task", width: width * 0.44, value: (t) => t.title },
        { label: "Assigned to", width: width * 0.22, value: (t) => personName(t.assignedTo) || "Unassigned" },
        { label: "Priority", width: width * 0.12, value: (t) => t.priority },
        { label: "Due", width: width * 0.22, value: (t) => prettyDate(t.dueDate, { dueDate: true }) },
      ],
      overdue,
      { rowColor: (t, c) => (c.label === "Due" ? COLORS.red : null) },
    );
  }

  // ---------- All tasks ----------
  sectionTitle(`All tasks (${tasks.length})`);
  if (!tasks.length) {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text("No tasks yet.");
  } else {
    table(
      [
        { label: "Task", width: width * 0.34, value: (t) => t.title },
        { label: "Status", width: width * 0.14, value: (t) => STATUS_LABELS[t.status] || t.status },
        { label: "Priority", width: width * 0.1, value: (t) => t.priority },
        { label: "Assigned to", width: width * 0.18, value: (t) => personName(t.assignedTo) || "Unassigned" },
        { label: "Due", width: width * 0.12, value: (t) => prettyDate(t.dueDate, { dueDate: true }) || "-" },
        { label: "Completed", width: width * 0.12, value: (t) => prettyDate(t.completedOn) || "-" },
      ],
      tasks,
      {
        rowColor: (t, c) => {
          if (c.label === "Due" && t.isOverdue) return COLORS.red;
          if (c.label === "Status") return STATUS_COLORS[t.status] === "#94a3b8" ? COLORS.muted : STATUS_COLORS[t.status];
          return null;
        },
      },
    );
  }

  // ---------- Footer: page numbers ----------
  const range_ = doc.bufferedPageRange();
  for (let i = range_.start; i < range_.start + range_.count; i += 1) {
    doc.switchToPage(i);
    // Neeche margin me likhne par PDFKit naya page bana deta hai -
    // isliye footer likhte waqt margin 0 kar do
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - originalBottom + 10;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(fit(project.name, width / 2), left, y, { width: width / 2, lineBreak: false })
      .text(`Page ${i + 1} of ${range_.count}`, left + width / 2, y, {
        width: width / 2,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = originalBottom;
  }
};

// ==========================================================
// GET /projects/:projectId/export?format=pdf|csv&range=30
// ==========================================================
const exportProjectReport = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const format = req.query.format === "csv" ? "csv" : "pdf";
  const range = normalizeRange(req.query.range);

  const data = await loadExportData(projectId, range);
  const fileBase = `${safeFileName(data.project.name)}-report-${localDateKey()}`;

  await logActivity({
    project: projectId,
    user: req.user._id,
    action: "PROJECT_EXPORTED",
    entityType: "project",
    entityId: projectId,
    description: `${req.user.username} downloaded a ${format.toUpperCase()} report`,
  });

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.csv"`);
    return res.status(200).send(buildCsv(data));
  }

  // PDF pehle memory me banta hai, phir bhejte hain - beech me error aaye to
  // aadhi-adhuri file download nahi hoti, saaf error JSON jaata hai
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: `${pdfText(data.project.name)} - Project Report`,
      Author: "Task Manager",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  buildPdf(doc, data);
  doc.end();
  await finished;

  const pdf = Buffer.concat(chunks);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.pdf"`);
  res.setHeader("Content-Length", pdf.length);
  return res.status(200).send(pdf);
});

export { exportProjectReport, buildCsv, buildPdf, csvCell };
