import { Check } from "lucide-react";

const STEPS = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "completed", label: "Completed" },
];

// Task kis stage par hai - workflow ek nazar me
export default function StatusStepper({ status }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.key === status));

  return (
    <ol className="flex items-center">
      {STEPS.map((step, index) => {
        const done = index < current || status === "completed";
        const active = index === current && status !== "completed";
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${
                  done
                    ? "border-green-500 bg-green-500 text-white"
                    : active
                      ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-600/20"
                      : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900"
                }`}
              >
                {done ? <Check size={16} /> : index + 1}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] font-medium sm:text-xs ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : done
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className="mx-1 mb-5 h-0.5 flex-1 rounded bg-slate-200 dark:bg-slate-700 sm:mx-2">
                <span
                  className="block h-full rounded bg-green-500 transition-all duration-700"
                  style={{ width: index < current || status === "completed" ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
