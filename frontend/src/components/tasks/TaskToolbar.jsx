import { ArrowUpDown, Search, X } from "lucide-react";
import {
  PRIORITY_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  DEFAULT_TASK_FILTERS,
  hasActiveFilters,
  saveSort,
} from "../../lib/taskUtils";

const selectClass =
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

/**
 * Search + Sort + Filters ki ek line.
 * props:
 *  - filters, onChange: state parent ke paas rehti hai
 *  - members: [{ user: { _id, username, fullName } }] -> assignee filter (optional)
 *  - showCount: "Showing X of Y"
 */
export default function TaskToolbar({
  filters,
  onChange,
  members = [],
  projects = [],
  totalCount = 0,
  visibleCount = 0,
  showAssignee = true,
  showStatus = true,
}) {
  const update = (key, value) => {
    if (key === "sortBy") saveSort(value);
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () =>
    onChange({ ...DEFAULT_TASK_FILTERS, sortBy: filters.sortBy });

  const active = hasActiveFilters(filters);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search tasks..."
            className={`${selectClass} w-full pl-9 pr-9`}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update("search", "")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <ArrowUpDown size={16} className="shrink-0" />
          <span className="sr-only">Sort by</span>
          <select
            value={filters.sortBy}
            onChange={(e) => update("sortBy", e.target.value)}
            className={`${selectClass} w-full lg:w-56`}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {showStatus && (
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={filters.priority}
          onChange={(e) => update("priority", e.target.value)}
          className={selectClass}
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {projects.length > 1 && (
          <select
            value={filters.project}
            onChange={(e) => update("project", e.target.value)}
            className={selectClass}
            aria-label="Filter by project"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {showAssignee && members.length > 0 && (
          <select
            value={filters.assignee}
            onChange={(e) => update("assignee", e.target.value)}
            className={selectClass}
            aria-label="Filter by assignee"
          >
            <option value="all">All members</option>
            <option value="unassigned">Unassigned</option>
            {members
              .filter((m) => m.user?._id)
              .map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.fullName || m.user.username}
                </option>
              ))}
          </select>
        )}

        {active && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 animate-fade-in"
          >
            <X size={14} />
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          Showing {visibleCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}
