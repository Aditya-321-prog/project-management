import { useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  MessageSquareQuote,
  RotateCcw,
  Send,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import Avatar from "./Avatar";
import { FileList, fileVisual, formatBytes } from "./fileUtils";

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

const STATUS_UI = {
  pending: {
    label: "Waiting for review",
    Icon: Clock,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    ring: "border-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    badge: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    ring: "border-green-300 dark:border-green-900",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Changes requested",
    Icon: XCircle,
    badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    ring: "border-red-300 dark:border-red-900",
    dot: "bg-red-500",
  },
};

const when = (date) =>
  date ? `${formatDistanceToNow(new Date(date), { addSuffix: true })}` : "";

const exact = (date) => (date ? format(new Date(date), "d MMM yyyy, h:mm a") : "");

/**
 * Submissions: member ka submit form + poori history + admin review.
 */
export default function SubmissionsPanel({
  task,
  isAdmin,
  isAssignee,
  onSubmit, // (files, note, links) => Promise
  onReview, // (submissionId, status, feedback) => Promise
}) {
  const submissions = [...(task.submissions || [])].sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
  );
  const attemptNumber = (s) => submissions.length - submissions.indexOf(s);

  const latest = submissions[0];
  const hasPending = submissions.some((s) => s.status === "pending");
  const isApproved = task.status === "completed" || submissions.some((s) => s.status === "approved");
  const canSubmit = isAssignee && !hasPending && !isApproved;

  return (
    <section
      id="submissions"
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Submissions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {submissions.length
              ? `${submissions.length} attempt${submissions.length > 1 ? "s" : ""}`
              : "Kaam ki files yahan submit hoti hain"}
          </p>
        </div>
        {latest && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_UI[latest.status]?.badge}`}
          >
            {STATUS_UI[latest.status]?.label}
          </span>
        )}
      </div>

      {/* ---------- Submit form ---------- */}
      {canSubmit && (
        <SubmitForm
          onSubmit={onSubmit}
          isResubmit={latest?.status === "rejected"}
        />
      )}

      {isAssignee && hasPending && (
        <InfoBox tone="amber" Icon={Clock}>
          Tumhara kaam review me hai. Admin ke feedback ka intezaar karo - result aate hi notification milega.
        </InfoBox>
      )}

      {isAssignee && isApproved && (
        <InfoBox tone="green" Icon={CheckCircle2}>
          Badhai ho! 🎉 Ye task approve ho chuka hai.
        </InfoBox>
      )}

      {/* ---------- History ---------- */}
      {submissions.length === 0 ? (
        !canSubmit && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {task.assignedTo?._id
              ? "Abhi tak kuch submit nahi hua."
              : "Task kisi ko assign nahi hai."}
          </p>
        )
      ) : (
        <ol className="relative mt-6 space-y-5 border-l-2 border-slate-100 pl-6 dark:border-slate-800">
          {submissions.map((submission) => (
            <SubmissionItem
              key={submission._id}
              submission={submission}
              attempt={attemptNumber(submission)}
              isLatest={submission === latest}
              canReview={isAdmin && submission.status === "pending"}
              onReview={onReview}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function InfoBox({ tone, Icon, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    green: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300",
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${tones[tone]} animate-fade-in`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

// ==========================================================
// Submit form: drag & drop + note
// ==========================================================
function SubmitForm({ onSubmit, isResubmit }) {
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState({ title: "", url: "" });
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const tooBig = incoming.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" 50 MB se badi hai`);
      return;
    }
    setError("");
    setFiles((prev) => {
      // Same naam + size wali file dobara na jude
      const merged = [...prev];
      incoming.forEach((f) => {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      });
      if (merged.length > MAX_FILES) {
        setError(`Ek baar me max ${MAX_FILES} files`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  };

  const isValidUrl = (value) => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return url.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const addLink = () => {
    const url = linkInput.url.trim();
    if (!url) return;
    if (!isValidUrl(url)) {
      setError("Ye link sahi nahi lag raha - jaise github.com/user/repo");
      return;
    }
    if (links.length >= 10) {
      setError("Max 10 links");
      return;
    }
    setError("");
    setLinks((prev) => [...prev, { title: linkInput.title.trim(), url }]);
    setLinkInput({ title: "", url: "" });
  };

  const handleSubmit = async () => {
    // Box me likha link "Add" dabaye bina bhi chala jaaye
    const pending = linkInput.url.trim();
    if (pending && !isValidUrl(pending)) {
      setError("Ye link sahi nahi lag raha - jaise github.com/user/repo");
      return;
    }
    const allLinks = pending
      ? [...links, { title: linkInput.title.trim(), url: pending }]
      : links;

    if (!files.length && !allLinks.length) {
      setError("Kam se kam ek file ya link add karo");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(files, note.trim(), allLinks);
      setFiles([]);
      setLinks([]);
      setLinkInput({ title: "", url: "" });
      setNote("");
    } catch (err) {
      setError(err?.response?.data?.message || "Submit nahi ho paaya");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 animate-fade-in">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        {isResubmit ? <RotateCcw size={16} /> : <Send size={16} />}
        {isResubmit ? "Changes karke dobara submit karo" : "Apna kaam submit karo"}
      </h3>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          dragging
            ? "scale-[1.01] border-blue-500 bg-blue-100/60 dark:bg-blue-900/30"
            : "border-slate-300 bg-white hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900"
        }`}
      >
        <UploadCloud size={28} className={dragging ? "text-blue-600" : "text-slate-400"} />
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Files yahan drop karo ya <span className="text-blue-600 dark:text-blue-400">browse karo</span>
        </p>
        <p className="text-xs text-slate-400">Max {MAX_FILES} files, har ek 50 MB tak. Sirf link dena ho to files zaroori nahi.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => {
            const { Icon, color } = fileVisual({ mimetype: file.type, filename: file.name });
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 animate-fade-in-up"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-md ${color}`}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800 dark:text-slate-100">{file.name}</span>
                  <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove ${file.name}`}
                  className="rounded p-1 text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Links: GitHub, Figma, Drive, live site... */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Link2 size={15} />
          Links <span className="font-normal text-slate-400">(GitHub, Figma, Drive, live site…)</span>
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={linkInput.title}
            onChange={(e) => setLinkInput({ ...linkInput, title: e.target.value })}
            placeholder="Title (optional)"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 sm:w-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={linkInput.url}
            onChange={(e) => setLinkInput({ ...linkInput, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="https://github.com/…"
            className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={addLink}
            disabled={!linkInput.url.trim()}
            className="flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Plus size={15} />
            Add
          </button>
        </div>

        {links.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {links.map((link, index) => (
              <li
                key={`${link.url}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 animate-fade-in-up"
              >
                <Link2 size={14} className="shrink-0 text-blue-600" />
                <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">
                  {link.title || link.url}
                </span>
                <button
                  type="button"
                  onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove link"
                  className="rounded p-1 text-slate-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={
          isResubmit
            ? "Kya-kya theek kiya? (optional)"
            : "Admin ke liye note - kya kiya, kuch dhyan dena ho to (optional)"
        }
        className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />

      {error && <p className="mt-2 text-sm text-red-500 animate-fade-in">{error}</p>}

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || (!files.length && !links.length && !linkInput.url.trim())}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </div>
  );
}

// ==========================================================
// Ek submission (timeline item)
// ==========================================================
function SubmissionItem({ submission, attempt, isLatest, canReview, onReview }) {
  const ui = STATUS_UI[submission.status] || STATUS_UI.pending;
  const StatusIcon = ui.Icon;
  const reviewer = submission.reviewedBy?._id ? submission.reviewedBy : null;

  return (
    <li className="relative animate-fade-in-up">
      {/* Timeline dot */}
      <span
        className={`absolute -left-[33px] top-4 h-4 w-4 rounded-full border-4 border-white dark:border-slate-900 ${ui.dot}`}
      />

      <div
        className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${
          isLatest ? ui.ring : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Avatar user={submission.submittedBy} size={34} />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {submission.submittedBy?.fullName || submission.submittedBy?.username || "Member"}
                <span className="ml-2 text-xs font-normal text-slate-400">Attempt #{attempt}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400" title={exact(submission.submittedAt)}>
                Submitted {when(submission.submittedAt)}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ui.badge}`}>
            <StatusIcon size={13} />
            {ui.label}
          </span>
        </div>

        {/* Member ka note */}
        {submission.note && (
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            “{submission.note}”
          </p>
        )}

        {/* Files */}
        {submission.files?.length > 0 && (
          <div className="mt-3">
            <FileList files={submission.files} compact />
          </div>
        )}

        {/* Links */}
        {submission.links?.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {submission.links.map((link, index) => (
              <a
                key={link._id || index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-slate-800/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Link2 size={17} />
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
        )}

        {/* Reviewer ka feedback */}
        {submission.status !== "pending" && (
          <div
            className={`mt-4 rounded-xl border-l-4 p-3 ${
              submission.status === "approved"
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : "border-red-500 bg-red-50 dark:bg-red-950/30"
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <MessageSquareQuote size={14} />
              {reviewer ? (
                <>
                  <Avatar user={reviewer} size={18} />
                  <span className="font-semibold">{reviewer.fullName || reviewer.username}</span>
                </>
              ) : (
                <span className="font-semibold">Reviewer</span>
              )}
              <span title={exact(submission.reviewedAt)}>· {when(submission.reviewedAt)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
              {submission.feedback ||
                (submission.status === "approved" ? "Approved without comments." : "No feedback given.")}
            </p>
          </div>
        )}

        {canReview && <ReviewBox submissionId={submission._id} onReview={onReview} />}
      </div>
    </li>
  );
}

// ==========================================================
// Admin review (har submission ka apna feedback box)
// ==========================================================
const QUICK_FEEDBACK = ["Great work! 👏", "Looks good", "Please add more details", "Check the requirements again"];

function ReviewBox({ submissionId, onReview }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const review = async (status) => {
    if (status === "rejected" && !feedback.trim()) {
      setError("Changes maangne ke liye feedback likhna zaroori hai - member ko pata chale kya theek karna hai.");
      return;
    }
    setError("");
    setLoading(status);
    try {
      await onReview(submissionId, status, feedback.trim());
    } catch (err) {
      setError(err?.response?.data?.message || "Review save nahi hua");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700 animate-fade-in">
      <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Review this submission</p>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {QUICK_FEEDBACK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setFeedback((prev) => (prev ? `${prev} ${q}` : q))}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
          >
            {q}
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Feedback likho - kya achha tha, kya badalna hai…"
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />

      {error && <p className="mt-1 text-sm text-red-500 animate-fade-in">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => review("rejected")}
          disabled={Boolean(loading)}
          className="flex items-center gap-1.5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {loading === "rejected" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
          Request changes
        </button>
        <button
          onClick={() => review("approved")}
          disabled={Boolean(loading)}
          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "approved" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          Approve
        </button>
      </div>
    </div>
  );
}
