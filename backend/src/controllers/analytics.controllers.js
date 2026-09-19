import mongoose from "mongoose";
import { Task } from "../models/task.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Activity } from "../models/activity.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  addDays,
  daysBetween,
  dueDateKey,
  localDateKey,
  DAY_MS,
} from "../utils/date.js";

const ALLOWED_RANGES = [7, 30, 90];
const STATUSES = ["todo", "in_progress", "in_review", "completed"];
const PRIORITIES = ["high", "medium", "low"];

// Purane tasks me completedAt nahi hai -> completed hain to updatedAt maan lo
const completedDate = (task) =>
  task.status === "completed" ? task.completedAt || task.updatedAt : null;

const round = (n, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const percent = (part, total) => (total ? round((part / total) * 100) : 0);

export const normalizeRange = (value) =>
  ALLOWED_RANGES.includes(Number(value)) ? Number(value) : 30;

// Analytics ka poora hisaab (API aur PDF/CSV export dono isse use karte hain)
export const buildProjectAnalytics = async (projectId, rangeInput) => {
  const range = normalizeRange(rangeInput);

  const today = localDateKey();
  const rangeStartKey = addDays(today, -(range - 1));
  const rangeStart = new Date(Date.now() - range * DAY_MS);

  const [tasks, members, activityByUser] = await Promise.all([
    Task.find({ project: projectId })
      .select("title status priority dueDate assignedTo createdAt updatedAt completedAt")
      .lean(),
    ProjectMember.find({ project: projectId })
      .populate("user", "username fullName avatar")
      .lean(),
    // Kaun kitna active raha (is range me)
    Activity.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId), createdAt: { $gte: rangeStart } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
  ]);

  // ---------- Har task ki derived info ek baar ----------
  const info = tasks.map((task) => {
    const doneAt = completedDate(task);
    const doneKey = doneAt ? localDateKey(doneAt) : null;
    const dueKey = task.dueDate ? dueDateKey(task.dueDate) : null;

    return {
      task,
      doneKey,
      dueKey,
      createdKey: localDateKey(task.createdAt),
      isDone: task.status === "completed",
      isOverdue: task.status !== "completed" && dueKey !== null && dueKey < today,
      onTime: doneKey && dueKey ? doneKey <= dueKey : null,
      daysToComplete:
        doneAt && task.createdAt
          ? (new Date(doneAt) - new Date(task.createdAt)) / DAY_MS
          : null,
      assignee: task.assignedTo?.toString() || null,
    };
  });

  const inRange = (key) => key && key >= rangeStartKey && key <= today;

  // ---------- Summary ----------
  const total = info.length;
  const completed = info.filter((i) => i.isDone).length;
  const overdue = info.filter((i) => i.isOverdue).length;
  const dueThisWeek = info.filter(
    (i) => !i.isDone && i.dueKey && i.dueKey >= today && daysBetween(today, i.dueKey) <= 7,
  ).length;

  const completedInRange = info.filter((i) => inRange(i.doneKey));
  const withDeadline = completedInRange.filter((i) => i.onTime !== null);
  const durations = completedInRange
    .map((i) => i.daysToComplete)
    .filter((d) => d !== null && d >= 0);

  const summary = {
    total,
    completed,
    active: total - completed,
    overdue,
    dueThisWeek,
    unassigned: info.filter((i) => !i.assignee && !i.isDone).length,
    completionRate: percent(completed, total),
    createdInRange: info.filter((i) => inRange(i.createdKey)).length,
    completedInRange: completedInRange.length,
    onTimeRate: withDeadline.length
      ? percent(withDeadline.filter((i) => i.onTime).length, withDeadline.length)
      : null,
    avgDaysToComplete: durations.length
      ? round(durations.reduce((a, b) => a + b, 0) / durations.length, 1)
      : null,
  };

  // ---------- Status & priority ----------
  const statusBreakdown = Object.fromEntries(
    STATUSES.map((s) => [s, info.filter((i) => i.task.status === s).length]),
  );

  // Priority sirf un tasks ki jo abhi baaki hain (kaam ka bojh)
  const priorityBreakdown = Object.fromEntries(
    PRIORITIES.map((p) => [
      p,
      info.filter((i) => !i.isDone && i.task.priority === p).length,
    ]),
  );

  // ---------- Trend: created vs completed ----------
  // 7/30 din -> roz ka, 90 din -> hafte ka
  const bucketDays = range > 30 ? 7 : 1;
  const bucketCount = Math.ceil(range / bucketDays);
  const buckets = Array.from({ length: bucketCount }, (_, idx) => {
    const start = addDays(rangeStartKey, idx * bucketDays);
    const end = addDays(start, bucketDays - 1);
    return { start, end, created: 0, completed: 0 };
  });

  const bucketIndex = (key) => {
    if (!inRange(key)) return -1;
    return Math.min(Math.floor(daysBetween(rangeStartKey, key) / bucketDays), bucketCount - 1);
  };

  for (const i of info) {
    const c = bucketIndex(i.createdKey);
    if (c >= 0) buckets[c].created += 1;
    const d = bucketIndex(i.doneKey);
    if (d >= 0) buckets[d].completed += 1;
  }

  // ---------- Member performance ----------
  const activityMap = new Map(activityByUser.map((a) => [a._id?.toString(), a.count]));

  const memberStats = members
    .filter((m) => m.user)
    .map((m) => {
      const id = m.user._id.toString();
      const mine = info.filter((i) => i.assignee === id);
      const done = mine.filter((i) => i.isDone);
      const doneWithDeadline = done.filter((i) => i.onTime !== null);

      return {
        user: m.user,
        role: m.role,
        assigned: mine.length,
        completed: done.length,
        active: mine.length - done.length,
        inProgress: mine.filter((i) => i.task.status === "in_progress").length,
        overdue: mine.filter((i) => i.isOverdue).length,
        completedInRange: done.filter((i) => inRange(i.doneKey)).length,
        completionRate: percent(done.length, mine.length),
        onTimeRate: doneWithDeadline.length
          ? percent(doneWithDeadline.filter((i) => i.onTime).length, doneWithDeadline.length)
          : null,
        activity: activityMap.get(id) || 0,
      };
    })
    .sort((a, b) => b.completedInRange - a.completedInRange || b.completed - a.completed);

  return {
    range,
    bucket: bucketDays === 1 ? "day" : "week",
    generatedAt: new Date(),
    summary,
    statusBreakdown,
    priorityBreakdown,
    trend: buckets,
    members: memberStats,
  };
};

// ==========================================
// GET /projects/:projectId/analytics?range=30
// ==========================================
const getProjectAnalytics = asyncHandler(async (req, res) => {
  const data = await buildProjectAnalytics(req.params.projectId, req.query.range);
  return res.status(200).json(new ApiResponse(200, data, "Analytics fetched"));
});

export { getProjectAnalytics };
