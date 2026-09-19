import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import Avatar from "./Avatar";

const MAX = 1000;

export default function CommentsSection({ comments, currentUserId, isAdmin, onAdd, onDelete }) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      await onAdd(value);
      setText("");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
        <MessageCircle size={18} className="text-blue-600" />
        Discussion
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {comments.length}
        </span>
      </h2>

      {/* Naya comment */}
      <div className="rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-700">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter = post
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={MAX}
          rows={2}
          placeholder="Sawaal pucho ya update do…"
          className="w-full resize-none rounded-t-xl bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none dark:text-slate-100"
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">Ctrl + Enter to post</span>
          <button
            onClick={submit}
            disabled={!text.trim() || posting}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Post
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-5 space-y-4">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Abhi koi comment nahi. Pehla comment tum karo 👋</p>
        ) : (
          comments.map((comment) => {
            const mine = comment.user?._id === currentUserId;
            return (
              <div key={comment._id} className="group flex gap-3 animate-fade-in-up">
                <Avatar user={comment.user} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {comment.user?.fullName || comment.user?.username}
                      {mine && <span className="ml-1 text-xs font-normal text-slate-400">(you)</span>}
                    </span>
                    <span className="text-xs text-slate-400" title={new Date(comment.createdAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {(mine || isAdmin) && (
                      <button
                        onClick={() => onDelete(comment._id)}
                        aria-label="Delete comment"
                        className="ml-auto rounded p-1 text-slate-400 opacity-0 transition hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
