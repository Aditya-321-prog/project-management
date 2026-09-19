import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Flag,
  FolderOpen,
} from "lucide-react";

import { getMyTasks } from "../../services/taskService";
import socket from "../../socket/socket";
import TaskToolbar from "../../components/tasks/TaskToolbar";
import DueBadge from "../../components/tasks/DueBadge";
import { PageSkeleton } from "../../components/common/Skeleton";
import CountUp from "../../components/common/CountUp";
import {
  DEFAULT_TASK_FILTERS,
  applyTaskFilters,
  getDueInfo,
  hasActiveFilters,
  isOverdue,
  loadSavedSort,
} from "../../lib/taskUtils";

const STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  in_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

const PRIORITY_STYLES = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-green-600 dark:text-green-400",
};

// Upar ke stat cards - click karne par quick filter lagta hai
const QUICK_VIEWS = {
  active: {
    label: "Active",
    icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500",
    match: (t) => t.status !== "completed",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    ring: "ring-red-500",
    match: isOverdue,
  },
  week: {
    label: "Due this week",
    icon: CalendarClock,
    color: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500",
    match: (t) => {
      const info = getDueInfo(t);
      return Boolean(info) && info.state !== "done" && info.daysLeft >= 0 && info.daysLeft <= 7;
    },
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    ring: "ring-green-500",
    match: (t) => t.status === "completed",
  },
};

export default function MyTasks() {
  const [scope, setScope] = useState("assigned");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState("active");
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_TASK_FILTERS,
    sortBy: loadSavedSort(),
  }));

  const fetchTasks = useCallback(async (currentScope) => {
    try {
      const res = await getMyTasks(currentScope);
      setTasks(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tab badalne par dobara load
  useEffect(() => {
    setLoading(true);
    fetchTasks(scope);
  }, [scope, fetchTasks]);

  // Real-time: kisi bhi task me badlav ho to list refresh
  // (thoda ruk kar, taaki ek saath 5 events aayen to 5 baar API na chale)
  const refreshTimer = useRef(null);
  useEffect(() => {
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => fetchTasks(scope), 400);
    };

    const events = [
      "task-created",
      "task-updated",
      "task-deleted",
      "task-submitted",
      "task-reviewed",
    ];

    events.forEach((event) => socket.on(event, scheduleRefresh));

    return () => {
      clearTimeout(refreshTimer.current);
      events.forEach((event) => socket.off(event, scheduleRefresh));
    };
  }, [scope, fetchTasks]);

  // Projects ki list (project filter ke liye)
  const projects = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.project?._id) map.set(t.project._id, t.project);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // "Created by me" tab me assignee filter
  const assignees = useMemo(() => {
    if (scope !== "created") return [];
    const map = new Map();
    tasks.forEach((t) => {
      if (t.assignedTo?._id) map.set(t.assignedTo._id, { user: t.assignedTo });
    });
    return [...map.values()];
  }, [tasks, scope]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(QUICK_VIEWS).map(([key, view]) => [
          key,
          tasks.filter(view.match).length,
        ]),
      ),
    [tasks],
  );

  const quickFiltered = useMemo(
    () => tasks.filter(QUICK_VIEWS[quickView]?.match || (() => true)),
    [tasks, quickView],
  );

  const visibleTasks = useMemo(
    () => applyTaskFilters(quickFiltered, filters),
    [quickFiltered, filters],
  );

  const switchScope = (next) => {
    if (next === scope) return;
    setScope(next);
    setFilters((prev) => ({ ...DEFAULT_TASK_FILTERS, sortBy: prev.sortBy }));
  };

  const resetAll = () => {
    setQuickView("all");
    setFilters((prev) => ({ ...DEFAULT_TASK_FILTERS, sortBy: prev.sortBy }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
            My Tasks
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Saare projects ke tasks ek jagah
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {[
            { key: "assigned", label: "Assigned to me" },
            { key: "created", label: "Created by me" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchScope(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                scope === tab.key
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* Stat cards = quick filters */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 stagger">
            {Object.entries(QUICK_VIEWS).map(([key, view]) => {
              const Icon = view.icon;
              const selected = quickView === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuickView(selected ? "all" : key)}
                  className={`rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 ${
                    selected ? `ring-2 ${view.ring}` : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {view.label}
                    </span>
                    <Icon size={18} className={view.color} />
                  </div>
                  <p className={`mt-3 text-3xl font-extrabold ${view.color}`}>
                    <CountUp value={counts[key]} />
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                {quickView === "all" ? "All tasks" : QUICK_VIEWS[quickView].label}
              </h2>
              {quickView !== "all" && (
                <button
                  onClick={() => setQuickView("all")}
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Show all tasks
                </button>
              )}
            </div>

            {tasks.length > 0 && (
              <TaskToolbar
                filters={filters}
                onChange={setFilters}
                projects={projects}
                members={assignees}
                showAssignee={scope === "created"}
                totalCount={quickFiltered.length}
                visibleCount={visibleTasks.length}
              />
            )}

            <div className="mt-5 space-y-3">
              {tasks.length === 0 ? (
                <EmptyState
                  text={
                    scope === "assigned"
                      ? "Abhi tumhe koi task assign nahi hua hai 🎉"
                      : "Tumne abhi tak kisi ko task assign nahi kiya"
                  }
                />
              ) : visibleTasks.length === 0 ? (
                <EmptyState
                  text="Is filter me koi task nahi hai"
                  action={
                    (quickView !== "all" || hasActiveFilters(filters)) && (
                      <button
                        onClick={resetAll}
                        className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Clear all filters
                      </button>
                    )
                  }
                />
              ) : (
                visibleTasks.map((task) => (
                  <TaskRow key={task._id} task={task} scope={scope} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700 animate-fade-in">
      <p className="text-slate-500 dark:text-slate-400">{text}</p>
      {action}
    </div>
  );
}

function TaskRow({ task, scope }) {
  const overdue = isOverdue(task);
  const person = scope === "created" ? task.assignedTo : task.assignedBy;
  const personLabel = scope === "created" ? "Assigned to" : "Assigned by";

  return (
    <Link
      to={`/projects/${task.project?._id}/tasks/${task._id}`}
      className={`block rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up sm:p-5 ${
        overdue ? "border-l-4 border-l-red-500" : ""
      } ${task.status === "completed" ? "opacity-75" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <FolderOpen size={12} />
            {task.project?.name || "Project"}
          </span>

          <h3
            className={`mt-2 truncate text-lg font-semibold text-slate-900 dark:text-slate-100 ${
              task.status === "completed" ? "line-through decoration-slate-400" : ""
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
              {task.description}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[task.status] || STATUS_STYLES.todo
          }`}
        >
          {STATUS_LABELS[task.status] || task.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span
          className={`flex items-center gap-1.5 font-medium capitalize ${
            PRIORITY_STYLES[task.priority] || ""
          }`}
        >
          <Flag size={14} />
          {task.priority}
        </span>

        <span
          className={`flex items-center gap-1.5 ${
            overdue
              ? "font-semibold text-red-600 dark:text-red-400"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          <Calendar size={14} />
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
        </span>

        <DueBadge task={task} />

        {person && (
          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {personLabel}
            <img
              src={person.avatar?.url || "https://placehold.co/40x40"}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {person.fullName || person.username}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
