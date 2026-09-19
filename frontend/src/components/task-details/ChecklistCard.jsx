import { useState } from "react";
import { CheckCircle2, Circle, ListChecks, Plus, Trash2 } from "lucide-react";

export default function ChecklistCard({ subtasks, canManage, onAdd, onToggle, onDelete }) {
  const [title, setTitle] = useState("");
  const done = subtasks.filter((s) => s.isCompleted).length;
  const progress = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  if (!canManage && subtasks.length === 0) return null;

  const add = async () => {
    const value = title.trim();
    if (!value) return;
    setTitle("");
    await onAdd(value);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          <ListChecks size={17} className="text-blue-600" />
          Checklist
        </h3>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {done}/{subtasks.length}
        </span>
      </div>

      {subtasks.length > 0 && (
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-green-500" : "bg-blue-600"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <ul className="space-y-1">
        {subtasks.map((subtask) => (
          <li key={subtask._id} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <button
              onClick={() => canManage && onToggle(subtask)}
              disabled={!canManage}
              aria-label={subtask.isCompleted ? "Mark as not done" : "Mark as done"}
              className="shrink-0 disabled:cursor-default"
            >
              {subtask.isCompleted ? (
                <CheckCircle2 size={18} className="text-green-500 animate-spin-in" />
              ) : (
                <Circle size={18} className="text-slate-300 dark:text-slate-600" />
              )}
            </button>
            <span
              className={`flex-1 text-sm transition-colors ${
                subtask.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {subtask.title}
            </span>
            {canManage && (
              <button
                onClick={() => onDelete(subtask._id)}
                aria-label="Delete item"
                className="rounded p-1 text-slate-400 opacity-0 transition hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="mt-3 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add an item…"
            className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={add}
            disabled={!title.trim()}
            aria-label="Add checklist item"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {!canManage && (
        <p className="mt-2 text-xs text-slate-400">Sirf assigned member ya admin checklist badal sakte hain.</p>
      )}
    </section>
  );
}
