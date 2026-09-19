// Date helpers - India time ke hisaab se "din" nikalna
// (server UTC me chal sakta hai, isliye timezone dena zaroori hai)

export const DAY_MS = 24 * 60 * 60 * 1000;

export const appTimezone = () => process.env.REMINDER_TIMEZONE || "Asia/Kolkata";

// Kisi bhi time ko "YYYY-MM-DD" (app timezone me)
export const localDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));

// Due date frontend se "YYYY-MM-DD" aati hai -> DB me UTC midnight.
// Isliye uska din UTC se hi nikalna sahi hai.
export const dueDateKey = (date) => new Date(date).toISOString().slice(0, 10);

export const daysBetween = (fromKey, toKey) =>
  Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY_MS);

export const addDays = (key, n) =>
  new Date(Date.parse(key) + n * DAY_MS).toISOString().slice(0, 10);
