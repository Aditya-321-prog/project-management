import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FolderPlus,
  History,
  ListChecks,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  StickyNote,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";

import socket from "../../socket/socket";
import { getProjectActivities } from "../../services/activityService";
import Avatar from "../task-details/Avatar";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "tasks", label: "Tasks" },
  { key: "members", label: "Members" },
  { key: "comments", label: "Comments" },
  { key: "notes", label: "Notes" },
  { key: "project", label: "Project" },
];

// Filter tab -> entity types (backend jaisa hi)
const FILTER_TYPES = {
  tasks: ["task"],
  members: ["member"],
  notes: ["note"],
  comments: ["comment"],
  project: ["project"],
};

const tone = {
  blue: "bg-blue-600",
  green: "bg-green-600",
  red: "bg-red-500",
  amber: "bg-amber-500",
  violet: "bg-violet-600",
  slate: "bg-slate-500",
  yellow: "bg-yellow-500",
  indigo: "bg-indigo-500",
  teal: "bg-teal-600",
};

// Har action ka icon + rang
const ACTION_META = {
  PROJECT_CREATED: { Icon: FolderPlus, color: tone.blue },
  PROJECT_UPDATED: { Icon: Pencil, color: tone.slate },
  PROJECT_EXPORTED: { Icon: Download, color: tone.slate },
  MEMBER_ADDED: { Icon: UserPlus, color: tone.green },
  MEMBER_REMOVED: { Icon: UserMinus, color: tone.red },
  ROLE_UPDATED: { Icon: ShieldCheck, color: tone.violet },
  TASK_CREATED: { Icon: Plus, color: tone.blue },
  TASK_UPDATED: { Icon: Pencil, color: tone.slate },
  TASK_DELETED: { Icon: Trash2, color: tone.red },
  TASK_SUBMITTED: { Icon: Send, color: tone.amber },
  TASK_REVIEWED: { Icon: CheckCircle2, color: tone.green },
  TASK_STATUS_CHANGED: { Icon: ArrowRightLeft, color: tone.blue },
  NOTE_CREATED: { Icon: StickyNote, color: tone.yellow },
  NOTE_UPDATED: { Icon: StickyNote, color: tone.yellow },
  NOTE_DELETED: { Icon: Trash2, color: tone.red },
  COMMENT_CREATED: { Icon: MessageSquare, color: tone.indigo },
  COMMENT_DELETED: { Icon: Trash2, color: tone.red },
};

const metaFor = (action = "") =>
  ACTION_META[action] ||
  (action.startsWith("SUBTASK_") ? { Icon: ListChecks, color: tone.teal } : { Icon: History, color: tone.slate });

const dayLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM");
};

// Description me pehle se username hota hai ("mahima created task X").
// Naam ko bold dikhane ke liye alag karte hain.
const splitDescription = (activity) => {
  const username = activity.user?.username || "";
  const text = activity.description || "";
  const rest = username && text.startsWith(username) ? text.slice(username.length).trim() : text;
  return {
    name: activity.user?.fullName || activity.user?.username || "Someone",
    rest,
  };
};

export default function ActivityFeed({ projectId }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [freshIds, setFreshIds] = useState([]);

  const load = useCallback(
    async (before) => {
      const res = await getProjectActivities(projectId, { type: filter, before });
      return res.data.data;
    },
    [projectId, filter],
  );

  // Filter / project badle -> shuru se
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((data) => {
        if (cancelled) return;
        setItems(data.activities);
        setHasMore(data.hasMore);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await load(last._id);
      setItems((prev) => [...prev, ...data.activities]);
      setHasMore(data.hasMore);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // Live: nayi activity upar aa jaati hai
  useEffect(() => {
    const handleNew = (activity) => {
      if ((activity.project?._id || activity.project)?.toString() !== projectId) return;
      if (filter !== "all" && !FILTER_TYPES[filter]?.includes(activity.entityType)) return;

      setItems((prev) => (prev.some((a) => a._id === activity._id) ? prev : [activity, ...prev]));
      setFreshIds((prev) => [...prev, activity._id]);
      setTimeout(() => setFreshIds((prev) => prev.filter((id) => id !== activity._id)), 2500);
    };

    socket.on("activity-created", handleNew);
    return () => socket.off("activity-created", handleNew);
  }, [projectId, filter]);

  // Din ke hisaab se groups
  const groups = [];
  items.forEach((activity) => {
    const label = dayLabel(activity.createdAt);
    const group = groups[groups.length - 1];
    if (group?.label === label) group.items.push(activity);
    else groups.push({ label, items: [activity] });
  });

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            <History size={20} className="text-blue-600" />
            Activity
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Project me kisne kya kiya. Checklist ki activity sirf tumhe dikhti hai.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="skeleton h-9 w-9 rounded-full" />
                <span className="flex-1 space-y-2">
                  <span className="skeleton block h-3 w-3/4 rounded" />
                  <span className="skeleton block h-2.5 w-24 rounded" />
                </span>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
            <History size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              {filter === "all" ? "No activity yet" : "Is filter me koi activity nahi"}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-3 text-xs font-semibold text-slate-400">{group.label}</p>

                <ol className="relative space-y-1">
                  {/* Timeline line */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-4 left-[17px] top-4 w-px bg-slate-200 dark:bg-slate-700"
                  />

                  {group.items.map((activity) => {
                    const { Icon, color } = metaFor(activity.action);
                    const { name, rest } = splitDescription(activity);
                    const isPrivate = activity.action?.startsWith("SUBTASK_");
                    const taskLink =
                      activity.entityType === "task" && activity.action !== "TASK_DELETED"
                        ? `/projects/${projectId}/tasks/${activity.entityId}`
                        : null;
                    const fresh = freshIds.includes(activity._id);

                    return (
                      <li
                        key={activity._id}
                        className={`relative flex gap-3 rounded-xl px-1 py-2 transition-colors duration-700 ${
                          fresh ? "bg-blue-50 animate-fade-in-up dark:bg-blue-950/30" : ""
                        }`}
                      >
                        {/* Avatar + action icon */}
                        <span className="relative shrink-0">
                          <Avatar user={activity.user} size={34} className="ring-4 ring-white dark:ring-slate-900" />
                          <span
                            className={`absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-slate-900 ${color}`}
                          >
                            <Icon size={10} strokeWidth={2.5} />
                          </span>
                        </span>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{name}</span>{" "}
                            {rest}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span title={format(new Date(activity.createdAt), "d MMM yyyy, h:mm a")}>
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                            {isPrivate && (
                              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <Lock size={10} />
                                Only you
                              </span>
                            )}
                            {taskLink && (
                              <Link
                                to={taskLink}
                                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                Open task
                              </Link>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {loadingMore && <Loader2 size={15} className="animate-spin" />}
                  Load older activity
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
