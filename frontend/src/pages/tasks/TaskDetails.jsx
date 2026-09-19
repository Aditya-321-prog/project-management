import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Link2,
  Paperclip,
  RotateCcw,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { useAuthStore } from "../../store/authStore";
import socket from "../../socket/socket.js";
import { getProjectById } from "../../services/projectService";
import { getTaskById, reviewTask, submitTask } from "../../services/taskService";
import {
  createSubtask,
  deleteSubtask,
  getSubtasks,
  updateSubtask,
} from "../../services/subtaskService";
import { createComment, deleteComment, getComments } from "../../services/commentService";

import { PageSkeleton } from "../../components/common/Skeleton";
import DueBadge from "../../components/tasks/DueBadge";
import { isOverdue } from "../../lib/taskUtils";
import Avatar from "../../components/task-details/Avatar";
import StatusStepper from "../../components/task-details/StatusStepper";
import SubmissionsPanel from "../../components/task-details/SubmissionsPanel";
import CommentsSection from "../../components/task-details/CommentsSection";
import ChecklistCard from "../../components/task-details/ChecklistCard";
import { FileList } from "../../components/task-details/fileUtils";

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

const STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  in_review: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
};

const formatDue = (date) =>
  date ? format(new Date(`${new Date(date).toISOString().slice(0, 10)}T00:00:00`), "EEE, d MMM yyyy") : null;

export default function TaskDetails() {
  const navigate = useNavigate();
  const { projectId, taskId } = useParams();
  const currentUser = useAuthStore((state) => state.user);

  const [task, setTask] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [comments, setComments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- Data ----------
  const fetchTask = useCallback(async () => {
    try {
      const res = await getTaskById(projectId, taskId);
      setTask(res.data.data);
    } catch {
      toast.error("Task nahi mila");
      navigate(`/projects/${projectId}`, { replace: true });
    }
  }, [projectId, taskId, navigate]);

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await getSubtasks(projectId, taskId);
      setSubtasks(res.data.data);
    } catch {
      // ignore
    }
  }, [projectId, taskId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await getComments(projectId, taskId);
      setComments(res.data.data);
    } catch {
      // ignore
    }
  }, [projectId, taskId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchTask(),
      fetchSubtasks(),
      fetchComments(),
      getProjectById(projectId)
        .then((res) => {
          setProjectRole(res.data.data.currentUserRole);
          setProjectName(res.data.data.project?.name || "");
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [projectId, fetchTask, fetchSubtasks, fetchComments]);

  // ---------- Real-time ----------
  // Task badla (submit / review / edit / kanban) -> dobara laao, taaki
  // shape hamesha same rahe. Ek saath kai events aayen to ek hi baar.
  const refreshTimer = useRef(null);
  useEffect(() => {
    const scheduleRefresh = (payload) => {
      if (payload?._id && payload._id !== taskId) return;
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(fetchTask, 300);
    };

    const handleDeleted = (data) => {
      if (data?.taskId?.toString() !== taskId) return;
      toast("Ye task delete ho gaya", { icon: "🗑️" });
      navigate(`/projects/${projectId}`, { replace: true });
    };

    const handleCommentCreated = (comment) => {
      if (comment.task?.toString() !== taskId) return;
      setComments((prev) =>
        prev.some((c) => c._id === comment._id) ? prev : [...prev, comment],
      );
    };

    const handleCommentDeleted = (data) => {
      if (data.taskId?.toString() !== taskId) return;
      setComments((prev) => prev.filter((c) => c._id !== data.commentId));
    };

    const events = ["task-updated", "task-submitted", "task-reviewed"];
    events.forEach((e) => socket.on(e, scheduleRefresh));
    socket.on("task-deleted", handleDeleted);
    socket.on("comment-created", handleCommentCreated);
    socket.on("comment-deleted", handleCommentDeleted);

    return () => {
      clearTimeout(refreshTimer.current);
      events.forEach((e) => socket.off(e, scheduleRefresh));
      socket.off("task-deleted", handleDeleted);
      socket.off("comment-created", handleCommentCreated);
      socket.off("comment-deleted", handleCommentDeleted);
    };
  }, [taskId, projectId, fetchTask, navigate]);

  if (loading || !task) return <PageSkeleton />;

  // ---------- Roles ----------
  const isAdmin = projectRole === "admin" || task.assignedBy?._id === currentUser?._id;
  const isAssignee = Boolean(task.assignedTo?._id) && task.assignedTo._id === currentUser?._id;
  const canManageChecklist = isAdmin || isAssignee;
  const canSeeSubmissions =
    isAdmin || isAssignee || task.submissions?.some((s) => s.submittedBy?._id === currentUser?._id);

  const submissions = [...(task.submissions || [])].sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
  );
  const latest = submissions[0];
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const overdue = isOverdue(task);

  // ---------- Handlers ----------
  const handleSubmit = async (files, note, links = []) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (note) formData.append("note", note);
    if (links.length) formData.append("links", JSON.stringify(links));
    await submitTask(projectId, taskId, formData);
    toast.success("Submitted for review 🚀");
    await fetchTask();
  };

  const handleReview = async (submissionId, status, feedback) => {
    await reviewTask(projectId, taskId, { submissionId, status, feedback });
    toast.success(status === "approved" ? "Approved ✅" : "Changes requested");
    await fetchTask();
  };

  const handleAddComment = async (content) => {
    const res = await createComment(projectId, taskId, { content });
    const created = res.data?.data;
    if (created?._id) {
      setComments((prev) => (prev.some((c) => c._id === created._id) ? prev : [...prev, created]));
    } else {
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    try {
      await deleteComment(projectId, taskId, commentId);
    } catch {
      setComments(snapshot);
    }
  };

  const handleAddSubtask = async (title) => {
    await createSubtask(projectId, taskId, { title });
    fetchSubtasks();
  };

  const handleToggleSubtask = async (subtask) => {
    // UI turant, server baad me
    setSubtasks((prev) =>
      prev.map((s) => (s._id === subtask._id ? { ...s, isCompleted: !s.isCompleted } : s)),
    );
    try {
      await updateSubtask(projectId, taskId, subtask._id, { isCompleted: !subtask.isCompleted });
    } catch {
      fetchSubtasks();
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    setSubtasks((prev) => prev.filter((s) => s._id !== subtaskId));
    try {
      await deleteSubtask(projectId, taskId, subtaskId);
    } catch {
      fetchSubtasks();
    }
  };

  const scrollToSubmissions = () =>
    document.getElementById("submissions")?.scrollIntoView({ behavior: "smooth" });

  // ---------- "Ab kya karna hai" banner ----------
  const nextStep = (() => {
    if (isAssignee) {
      if (task.status === "completed") {
        return { tone: "green", Icon: CheckCircle2, text: "Task complete ho gaya. Great job! 🎉" };
      }
      if (latest?.status === "pending") {
        return { tone: "amber", Icon: Clock, text: "Tumhara submission review me hai." };
      }
      if (latest?.status === "rejected") {
        return {
          tone: "red",
          Icon: RotateCcw,
          text: `Changes requested: "${latest.feedback?.slice(0, 140) || "feedback dekho"}"`,
          action: "Fix & resubmit",
        };
      }
      return {
        tone: "blue",
        Icon: Sparkles,
        text: overdue ? "Deadline nikal chuki hai - jaldi submit karo!" : "Kaam ho jaaye to files submit karo.",
        action: "Submit work",
      };
    }
    if (isAdmin && pendingCount > 0) {
      return {
        tone: "amber",
        Icon: Clock,
        text: `${pendingCount} submission tumhare review ka intezaar kar raha hai.`,
        action: "Review now",
      };
    }
    return null;
  })();

  const toneStyles = {
    green: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
    blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb */}
      <Link
        to={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400"
      >
        <ArrowLeft size={16} />
        {projectName || "Back to project"}
      </Link>

      {/* ========== Hero ========== */}
      <section
        className={`rounded-2xl border bg-white p-5 dark:bg-slate-900 sm:p-7 ${
          overdue ? "border-red-300 dark:border-red-900" : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status] || task.status}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              PRIORITY_STYLES[task.priority] || ""
            }`}
          >
            <Flag size={12} />
            {task.priority} priority
          </span>
          <DueBadge task={task} />
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-900 dark:text-white sm:text-3xl">
          {task.title}
        </h1>

        {task.description ? (
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">
            {task.description}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-slate-400">No description</p>
        )}

        {/* Meta */}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 lg:grid-cols-4">
          <Meta label="Assigned to">
            {task.assignedTo?._id ? (
              <span className="flex items-center gap-2">
                <Avatar user={task.assignedTo} size={24} />
                <span className="truncate">{task.assignedTo.fullName || task.assignedTo.username}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 italic text-slate-400">
                <UserCircle2 size={16} /> Unassigned
              </span>
            )}
          </Meta>
          <Meta label="Assigned by">
            <span className="flex items-center gap-2">
              <Avatar user={task.assignedBy} size={24} />
              <span className="truncate">{task.assignedBy?.fullName || task.assignedBy?.username || "-"}</span>
            </span>
          </Meta>
          <Meta label="Due date">
            <span className={`flex items-center gap-1.5 ${overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>
              {overdue ? <AlertTriangle size={15} /> : <Calendar size={15} />}
              {formatDue(task.dueDate) || "No due date"}
            </span>
          </Meta>
          <Meta label={task.completedAt ? "Completed" : "Created"}>
            <span title={format(new Date(task.completedAt || task.createdAt), "d MMM yyyy, h:mm a")}>
              {formatDistanceToNow(new Date(task.completedAt || task.createdAt), { addSuffix: true })}
            </span>
          </Meta>
        </dl>

        {/* Workflow */}
        <div className="mt-6 rounded-xl bg-slate-50 px-3 py-4 dark:bg-slate-800/40 sm:px-6">
          <StatusStepper status={task.status} />
        </div>

        {/* Next step */}
        {nextStep && (
          <div
            className={`mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in ${toneStyles[nextStep.tone]}`}
          >
            <p className="flex items-start gap-2 text-sm font-medium">
              <nextStep.Icon size={18} className="mt-0.5 shrink-0" />
              {nextStep.text}
            </p>
            {nextStep.action && (
              <button
                onClick={scrollToSubmissions}
                className="shrink-0 self-start rounded-lg bg-white/80 px-3 py-1.5 text-sm font-semibold shadow-sm hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900 sm:self-auto"
              >
                {nextStep.action} →
              </button>
            )}
          </div>
        )}
      </section>

      {/* ========== Body ========== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {canSeeSubmissions ? (
            <SubmissionsPanel
              task={task}
              isAdmin={isAdmin}
              isAssignee={isAssignee}
              onSubmit={handleSubmit}
              onReview={handleReview}
            />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Submissions: </span>
              {submissions.length
                ? `${submissions.length} attempt(s). Files sirf assigned member aur admins dekh sakte hain.`
                : "Abhi tak kuch submit nahi hua."}
            </section>
          )}

          <CommentsSection
            comments={comments}
            currentUserId={currentUser?._id}
            isAdmin={isAdmin}
            onAdd={handleAddComment}
            onDelete={handleDeleteComment}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <ChecklistCard
            subtasks={subtasks}
            canManage={canManageChecklist}
            onAdd={handleAddSubtask}
            onToggle={handleToggleSubtask}
            onDelete={handleDeleteSubtask}
          />

          <SideCard title="Attachments" Icon={Paperclip} count={task.attachments?.length}>
            {task.attachments?.length ? (
              <FileList files={task.attachments} />
            ) : (
              <p className="text-sm text-slate-400">No attachments</p>
            )}
          </SideCard>

          <SideCard title="Links" Icon={Link2} count={task.links?.length}>
            {task.links?.length ? (
              <div className="space-y-2">
                {task.links.map((link) => (
                  <a
                    key={link._id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-slate-800/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Link2 size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                        {link.title || link.url}
                      </span>
                      <span className="block truncate text-xs text-slate-400">{link.url}</span>
                    </span>
                    <ExternalLink size={14} className="shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No links</p>
            )}
          </SideCard>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

function SideCard({ title, Icon, count, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <Icon size={17} className="text-blue-600" />
        {title}
        {count > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}
