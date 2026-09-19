import cron from "node-cron";
import { runDeadlineReminders } from "../services/reminder.service.js";

// Default: roz subah 9 baje (India time)
// .env me badal sakte ho: REMINDER_CRON="0 9 * * *"
export const startSchedulers = () => {
  const expression = process.env.REMINDER_CRON || "0 9 * * *";
  const timezone = process.env.REMINDER_TIMEZONE || "Asia/Kolkata";

  if (process.env.REMINDERS_ENABLED === "false") {
    console.log("⏸️  Deadline reminders disabled (REMINDERS_ENABLED=false)");
    return;
  }

  if (!cron.validate(expression)) {
    console.error(`❌ Invalid REMINDER_CRON: "${expression}" - reminders band hain`);
    return;
  }

  const run = async (reason) => {
    try {
      const stats = await runDeadlineReminders();
      if (!stats.skipped && (stats.dueSoon || stats.overdue)) {
        console.log(`⏰ Reminders (${reason}):`, stats);
      }
    } catch (error) {
      console.error("Deadline reminder job failed:", error);
    }
  };

  cron.schedule(expression, () => run("scheduled"), {
    timezone,
    name: "deadline-reminders",
  });

  // Free hosting (Render) par server so jaata hai aur 9 baje wala run chhoot
  // sakta hai - isliye server start hone ke 30 sec baad bhi ek baar check.
  // Duplicate nahi jaayenge (task.reminders me record rehta hai).
  setTimeout(() => run("startup"), 30 * 1000);

  console.log(`⏰ Deadline reminders scheduled: "${expression}" (${timezone})`);
};
