import { Task } from "../models/task.models.js";
import { User } from "../models/user.models.js";
import { Notification } from "../models/notification.models.js";
import { TaskStatusEnum } from "../utils/constants.js";
import { getIO } from "../socket/socket.js";
import { sendEmail, deadlineReminderMailgenContent } from "../utils/mail.js";
import { DAY_MS, daysBetween, dueDateKey, localDateKey } from "../utils/date.js";

// ==========================================================
// Deadline reminders
// - Kal ya aaj due  -> "Due soon" (har deadline ke liye ek hi baar)
// - Deadline nikal gayi -> "Overdue" (ek hi baar) + task dene wale admin ko bhi
// - Har user ko ek hi email (digest) jisme uske saare tasks hon
// Duplicate se bachne ke liye task.reminders me deadline save hoti hai.
// ==========================================================

// Date helpers ab common file me (analytics bhi use karta hai)
const todayKey = (now = new Date()) => localDateKey(now);
const dateKey = dueDateKey;

const sameDate = (a, b) => Boolean(a && b) && new Date(a).getTime() === new Date(b).getTime();

const dueLabel = (daysLeft) => {
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  const n = Math.abs(daysLeft);
  return `${n} day${n > 1 ? "s" : ""} ago`;
};

let running = false;

export const runDeadlineReminders = async ({ now = new Date() } = {}) => {
  // Ek saath do baar na chale (cron + manual)
  if (running) return { skipped: true };
  running = true;

  const stats = { dueSoon: 0, overdue: 0, notifications: 0, emails: 0 };

  try {
    const today = todayKey(now);
    const dayAfterTomorrow = new Date(Date.parse(today) + 2 * DAY_MS);

    // Sirf woh tasks jo complete nahi hue, kisi ko assigned hain,
    // aur jinki deadline kal tak ki hai (ya nikal chuki hai)
    const tasks = await Task.find({
      status: { $ne: TaskStatusEnum.COMPLETED },
      assignedTo: { $ne: null },
      dueDate: { $ne: null, $lt: dayAfterTomorrow },
    })
      .select("title priority dueDate assignedTo assignedBy project reminders")
      .populate("project", "name")
      .lean();

    const perUser = new Map(); // userId -> { dueSoon: [], overdue: [] }
    const adminAlerts = []; // { adminId, task }
    const updates = [];

    const bucket = (userId) => {
      const key = userId.toString();
      if (!perUser.has(key)) perUser.set(key, { dueSoon: [], overdue: [] });
      return perUser.get(key);
    };

    for (const task of tasks) {
      // Project delete ho chuka ho to chhod do
      if (!task.project) continue;

      const daysLeft = daysBetween(today, dateKey(task.dueDate));
      const item = {
        _id: task._id,
        title: task.title,
        projectId: task.project._id,
        projectName: task.project.name,
        priority: task.priority,
        daysLeft,
        dueLabel: dueLabel(daysLeft),
      };

      if (daysLeft >= 0 && daysLeft <= 1) {
        if (sameDate(task.reminders?.dueSoonFor, task.dueDate)) continue;
        bucket(task.assignedTo).dueSoon.push(item);
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { "reminders.dueSoonFor": task.dueDate } },
          },
        });
        stats.dueSoon += 1;
      } else if (daysLeft < 0) {
        if (sameDate(task.reminders?.overdueFor, task.dueDate)) continue;
        bucket(task.assignedTo).overdue.push(item);
        if (task.assignedBy && task.assignedBy.toString() !== task.assignedTo.toString()) {
          adminAlerts.push({ adminId: task.assignedBy, assigneeId: task.assignedTo, item });
        }
        updates.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { "reminders.overdueFor": task.dueDate } },
          },
        });
        stats.overdue += 1;
      }
    }

    if (!updates.length) return stats;

    // ---------- In-app notifications ----------
    const notificationDocs = [];

    for (const [userId, { dueSoon, overdue }] of perUser) {
      for (const t of overdue) {
        notificationDocs.push({
          recipient: userId,
          title: "Task Overdue",
          message: `"${t.title}" (${t.projectName}) is overdue - it was due ${t.dueLabel}.`,
          type: "task",
        });
      }
      for (const t of dueSoon) {
        notificationDocs.push({
          recipient: userId,
          title: "Deadline Reminder",
          message: `"${t.title}" (${t.projectName}) is due ${t.dueLabel.toLowerCase()}.`,
          type: "task",
        });
      }
    }

    // Admin ko: tumhare diye task ki deadline nikal gayi
    const assigneeIds = [...new Set(adminAlerts.map((a) => a.assigneeId.toString()))];
    const assignees = await User.find({ _id: { $in: assigneeIds } })
      .select("username fullName")
      .lean();
    const nameOf = new Map(assignees.map((u) => [u._id.toString(), u.fullName || u.username]));

    for (const { adminId, assigneeId, item } of adminAlerts) {
      notificationDocs.push({
        recipient: adminId,
        title: "Task Overdue",
        message: `${nameOf.get(assigneeId.toString()) || "A member"}'s task "${item.title}" (${item.projectName}) is overdue.`,
        type: "task",
      });
    }

    const created = await Notification.insertMany(notificationDocs);
    stats.notifications = created.length;

    for (const n of created) {
      getIO().to(n.recipient.toString()).emit("new-notification", n);
    }

    // ---------- Emails (har user ko ek digest) ----------
    const users = await User.find({ _id: { $in: [...perUser.keys()] } })
      .select("email username fullName emailReminders")
      .lean();

    for (const user of users) {
      if (user.emailReminders === false || !user.email) continue;

      const { dueSoon, overdue } = perUser.get(user._id.toString());
      const total = dueSoon.length + overdue.length;

      await sendEmail({
        email: user.email,
        subject: overdue.length
          ? `⚠️ ${overdue.length} task overdue${dueSoon.length ? ` + ${dueSoon.length} due soon` : ""}`
          : `⏰ ${total} task${total > 1 ? "s" : ""} due soon`,
        mailgenContent: deadlineReminderMailgenContent(user.fullName || user.username, {
          dueSoon,
          overdue,
        }),
      });
      stats.emails += 1;
    }

    // Sab bhejne ke baad hi "bhej diya" mark karo
    await Task.bulkWrite(updates);

    return stats;
  } finally {
    running = false;
  }
};

// Testing ke liye export
export const _internal = { todayKey, dateKey, daysBetween, dueLabel };
