import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Flag, GripVertical, Lock } from "lucide-react";

import DueBadge from "./DueBadge";
import {
  STATUS_OPTIONS,
  getAllowedStatuses,
  isOverdue,
  sortTasks,
} from "../../lib/taskUtils";

const COLUMN_STYLES = {
  todo: {
    dot: "bg-slate-400",
    header: "text-slate-700 dark:text-slate-200",
    drop: "ring-slate-400 bg-slate-100/80 dark:bg-slate-800/80",
  },
  in_progress: {
    dot: "bg-blue-500",
    header: "text-blue-700 dark:text-blue-400",
    drop: "ring-blue-400 bg-blue-50 dark:bg-blue-950/40",
  },
  in_review: {
    dot: "bg-yellow-500",
    header: "text-yellow-700 dark:text-yellow-400",
    drop: "ring-yellow-400 bg-yellow-50 dark:bg-yellow-950/40",
  },
  completed: {
    dot: "bg-green-500",
    header: "text-green-700 dark:text-green-400",
    drop: "ring-green-400 bg-green-50 dark:bg-green-950/40",
  },
};

const PRIORITY_STYLES = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-green-600 dark:text-green-400",
};

/**
 * Kanban board (Todo / In Progress / In Review / Completed)
 * - Desktop: card ko pakad kar doosre column me chhodo (drag & drop)
 * - Mobile: card par "Move to" dropdown (touch par drag kaam nahi karta)
 *
 * props:
 *  - tasks: already filtered tasks
 *  - sortBy: har column ke andar ka order
 *  - isAdmin, userId: kaun kya move kar sakta hai
 *  - onMove(task, newStatus): parent API call karta hai
 *  - projectId
 */
export default function KanbanBoard({
  tasks,
  sortBy = "smart",
  isAdmin,
  userId,
  onMove,
  projectId,
}) {
  const [draggingTask, setDraggingTask] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const ctx = { isAdmin, userId };

  const allowedForDragging = draggingTask
    ? getAllowedStatuses(draggingTask, ctx)
    : [];

  const handleDrop = (status) => {
    if (draggingTask && draggingTask.status !== status && allowedForDragging.includes(status)) {
      onMove(draggingTask, status);
    }
    setDraggingTask(null);
    setOverColumn(null);
  };

  return (
    <div className="mt-5 -mx-1 overflow-x-auto pb-2">
      <div className="grid min-w-[880px] grid-cols-4 gap-4 px-1">
        {STATUS_OPTIONS.map((column) => {
          const columnTasks = sortTasks(
            tasks.filter((t) => t.status === column.value),
            sortBy,
          );
          const style = COLUMN_STYLES[column.value];

          // Drag ke waqt: kahan chhod sakte ho / kahan nahi
          const isDropAllowed =
            draggingTask &&
            draggingTask.status !== column.value &&
            allowedForDragging.includes(column.value);
          const isBlocked = draggingTask && !isDropAllowed && draggingTask.status !== column.value;
          const isOver = overColumn === column.value && isDropAllowed;

          return (
            <section
              key={column.value}
              onDragOver={(e) => {
                if (!isDropAllowed) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overColumn !== column.value) setOverColumn(column.value);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(column.value);
              }}
              className={`flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all duration-200 dark:border-slate-800 dark:bg-slate-950/40 ${
                isOver ? `ring-2 ${style.drop}` : ""
              } ${isBlocked ? "opacity-50" : ""} ${
                isDropAllowed && !isOver ? "border-dashed border-slate-400 dark:border-slate-600" : ""
              }`}
            >
              {/* Column header */}
              <header className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <h3 className={`text-sm font-semibold ${style.header}`}>
                    {column.label}
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                  {columnTasks.length}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {isDropAllowed ? "Drop here" : "No tasks"}
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <KanbanCard
                      key={task._id}
                      task={task}
                      projectId={projectId}
                      allowed={getAllowedStatuses(task, ctx)}
                      isDragging={draggingTask?._id === task._id}
                      onDragStart={() => setDraggingTask(task)}
                      onDragEnd={() => {
                        setDraggingTask(null);
                        setOverColumn(null);
                      }}
                      onMove={onMove}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
        {isAdmin
          ? "Tip: card ko pakad kar doosre column me chhodo."
          : "Tip: tum apne tasks Todo ↔ In Progress me move kar sakte ho. Review ke liye task page se submit karo."}
      </p>
    </div>
  );
}

function KanbanCard({ task, projectId, allowed, isDragging, onDragStart, onDragEnd, onMove }) {
  const draggable = allowed.length > 0;
  const overdue = isOverdue(task);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task._id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "rotate-2 scale-95 opacity-40" : ""} ${
        overdue ? "border-l-4 border-l-red-500" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {draggable ? (
          <GripVertical
            size={16}
            className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600"
          />
        ) : (
          <Lock
            size={14}
            className="mt-1 shrink-0 text-slate-300 dark:text-slate-600"
            aria-label="You cannot move this task"
          />
        )}

        <Link
          to={`/projects/${projectId}/tasks/${task._id}`}
          draggable={false}
          className="min-w-0 flex-1 text-sm font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
        >
          <span className="line-clamp-2">{task.title}</span>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className={`flex items-center gap-1 font-medium capitalize ${PRIORITY_STYLES[task.priority] || ""}`}>
          <Flag size={12} />
          {task.priority}
        </span>

        {task.dueDate && (
          <span
            className={`flex items-center gap-1 ${
              overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Calendar size={12} />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <DueBadge task={task} className="mt-2" />

      <div className="mt-3 flex items-center justify-between gap-2">
        {task.assignedTo ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <img
              src={task.assignedTo.avatar?.url || "https://placehold.co/40x40"}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full object-cover"
            />
            <span className="truncate">
              {task.assignedTo.fullName || task.assignedTo.username}
            </span>
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">Unassigned</span>
        )}

        {/* Mobile / keyboard ke liye: dropdown se move */}
        {draggable && (
          <select
            value={task.status}
            onChange={(e) => onMove(task, e.target.value)}
            aria-label="Move task"
            className="h-7 max-w-[7.5rem] rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            {STATUS_OPTIONS.filter(
              (s) => s.value === task.status || allowed.includes(s.value),
            ).map((s) => (
              <option key={s.value} value={s.value}>
                {s.value === task.status ? s.label : `→ ${s.label}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
