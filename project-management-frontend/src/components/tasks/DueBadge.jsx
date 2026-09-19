import { AlertTriangle, Clock } from "lucide-react";
import { getDueInfo } from "../../lib/taskUtils";

const STYLES = {
  overdue:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900",
  today:
    "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:ring-orange-900",
  soon:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900",
};

// "Overdue by 2 days" / "Due today" / "Due in 3 days" wala chhota badge
export default function DueBadge({ task, className = "" }) {
  const info = getDueInfo(task);

  if (!info || !STYLES[info.state]) return null;

  const Icon = info.state === "overdue" ? AlertTriangle : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STYLES[info.state]} ${
        info.state === "overdue" ? "animate-pulse" : ""
      } ${className}`}
    >
      <Icon size={12} />
      {info.label}
    </span>
  );
}
