import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { isProduction } from "../utils/config.js";
import { runDeadlineReminders } from "../services/reminder.service.js";

// POST /reminders/run - testing ke liye turant chalao (9 baje ka wait nahi)
// Production me band hai jab tak REMINDERS_ALLOW_MANUAL=true na ho
const runRemindersNow = asyncHandler(async (req, res) => {
  if (isProduction && process.env.REMINDERS_ALLOW_MANUAL !== "true") {
    throw new ApiError(403, "Manual reminder run is disabled in production");
  }

  const stats = await runDeadlineReminders();

  return res
    .status(200)
    .json(new ApiResponse(200, stats, stats.skipped ? "Already running" : "Reminders processed"));
});

export { runRemindersNow };
