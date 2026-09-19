// ==========================================================
// Tasks ke liye common helpers: sorting, filtering, deadline info.
// Project page, My Tasks page aur Kanban board teeno isi file ko use karenge.
// ==========================================================

export const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

export const STATUS_OPTIONS = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

export const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const SORT_OPTIONS = [
  { value: "smart", label: "Smart (recommended)" },
  { value: "priority", label: "Priority: High → Low" },
  { value: "deadline", label: "Deadline: Nearest first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title: A → Z" },
];

export const DEFAULT_TASK_FILTERS = {
  search: "",
  status: "all",
  priority: "all",
  assignee: "all",
  project: "all",
  sortBy: "smart",
};

const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Deadline ka haal: overdue / aaj / jaldi / baad me
// daysLeft: 0 = aaj, 1 = kal, -2 = 2 din pehle nikal gaya
export const getDueInfo = (task) => {
  if (!task?.dueDate) return null;

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const daysLeft = Math.round((due - startOfToday()) / DAY);
  const done = task.status === "completed";

  if (done) return { state: "done", daysLeft };
  if (daysLeft < 0) {
    const n = Math.abs(daysLeft);
    return { state: "overdue", daysLeft, label: `Overdue by ${n} day${n > 1 ? "s" : ""}` };
  }
  if (daysLeft === 0) return { state: "today", daysLeft, label: "Due today" };
  if (daysLeft === 1) return { state: "soon", daysLeft, label: "Due tomorrow" };
  if (daysLeft <= 3) return { state: "soon", daysLeft, label: `Due in ${daysLeft} days` };
  return { state: "later", daysLeft };
};

export const isOverdue = (task) => getDueInfo(task)?.state === "overdue";

const dueTime = (task) =>
  task.dueDate ? new Date(task.dueDate).getTime() : Number.POSITIVE_INFINITY;

const createdTime = (task) => new Date(task.createdAt || 0).getTime();

const byPriority = (a, b) =>
  (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);

// Bina deadline wale tasks hamesha end me
const byDeadline = (a, b) => dueTime(a) - dueTime(b);

const byNewest = (a, b) => createdTime(b) - createdTime(a);

// Smart order:
// 1. Completed sabse neeche
// 2. Overdue sabse upar
// 3. Phir priority (High pehle)
// 4. Phir jiska deadline paas hai
// 5. Phir naye pehle
const smartCompare = (a, b) => {
  const aDone = a.status === "completed";
  const bDone = b.status === "completed";
  if (aDone !== bDone) return aDone ? 1 : -1;

  const aOver = isOverdue(a);
  const bOver = isOverdue(b);
  if (aOver !== bOver) return aOver ? -1 : 1;

  return byPriority(a, b) || byDeadline(a, b) || byNewest(a, b);
};

// Priority / Deadline sort me bhi completed tasks neeche rahein
// (warna purani deadline wale completed tasks sabse upar aa jaate)
const doneLast = (a, b) =>
  (a.status === "completed") - (b.status === "completed");

const COMPARATORS = {
  smart: smartCompare,
  priority: (a, b) => doneLast(a, b) || byPriority(a, b) || byDeadline(a, b),
  deadline: (a, b) => doneLast(a, b) || byDeadline(a, b) || byPriority(a, b),
  newest: byNewest,
  oldest: (a, b) => createdTime(a) - createdTime(b),
  title: (a, b) => (a.title || "").localeCompare(b.title || ""),
};

// Original array ko nahi chhedta - nayi sorted copy deta hai
export const sortTasks = (tasks = [], sortBy = "smart") =>
  [...tasks].sort(COMPARATORS[sortBy] || smartCompare);

export const filterTasks = (tasks = [], filters = DEFAULT_TASK_FILTERS) => {
  const search = filters.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.status && filters.status !== "all" && task.status !== filters.status) {
      return false;
    }

    if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    if (filters.assignee && filters.assignee !== "all") {
      const assigneeId = task.assignedTo?._id || task.assignedTo || null;
      if (filters.assignee === "unassigned") {
        if (assigneeId) return false;
      } else if (assigneeId?.toString() !== filters.assignee) {
        return false;
      }
    }

    if (filters.project && filters.project !== "all") {
      const projectId = task.project?._id || task.project;
      if (projectId?.toString() !== filters.project) return false;
    }

    if (search) {
      const text = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      if (!text.includes(search)) return false;
    }

    return true;
  });
};

export const applyTaskFilters = (tasks, filters) =>
  sortTasks(filterTasks(tasks, filters), filters.sortBy);

export const hasActiveFilters = (filters) =>
  Boolean(filters.search?.trim()) ||
  ["status", "priority", "assignee", "project"].some((key) => filters[key] && filters[key] !== "all");

// Sort ki choice yaad rakhna (page refresh ke baad bhi)
const SORT_STORAGE_KEY = "task-sort-by";

export const loadSavedSort = () => {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return COMPARATORS[saved] ? saved : "smart";
  } catch {
    return "smart";
  }
};

export const saveSort = (sortBy) => {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  } catch {
    // private mode me storage band ho sakta hai - koi dikkat nahi
  }
};

// ==========================================
// Kanban: kaun kis status me move kar sakta hai
// (backend ka same rule - yahan sirf UI ke liye)
// ==========================================
const MEMBER_MOVABLE = ["todo", "in_progress"];

export const getAllowedStatuses = (task, { isAdmin, userId }) => {
  if (isAdmin) return STATUS_OPTIONS.map((s) => s.value);

  const isAssignee = (task.assignedTo?._id || task.assignedTo)?.toString() === userId;
  if (!isAssignee || !MEMBER_MOVABLE.includes(task.status)) return [];

  return MEMBER_MOVABLE;
};

export const canMoveTask = (task, ctx) => getAllowedStatuses(task, ctx).length > 0;
