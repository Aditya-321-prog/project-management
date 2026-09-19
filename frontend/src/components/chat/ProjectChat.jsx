import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";

import socket from "../../socket/socket";
import {
  deleteMessage,
  getMessages,
  getUnreadCount,
  markChatRead,
  sendMessage,
} from "../../services/chatService";

const MAX_LENGTH = 2000;
const GROUP_GAP_MS = 5 * 60 * 1000; // 5 min ke andar same bande ke messages ek group

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const dayLabel = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const timeLabel = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const senderId = (msg) => msg.sender?._id || msg.sender;

/**
 * Project group chat.
 * Neeche-right me ek chat button (unread badge ke saath), click par side panel.
 */
export default function ProjectChat({ projectId, projectName, currentUser, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [showJump, setShowJump] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const openRef = useRef(open);
  const stickToBottom = useRef(true);
  const scrollRestore = useRef(null);
  const typingTimers = useRef({});
  const lastTypingSent = useRef(0);
  const stopTypingTimer = useRef(null);

  const myId = currentUser?._id;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // ---------- Scroll helpers ----------
  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setShowJump(false);
  };

  // Naye messages aane ke baad: ya toh neeche le jao, ya purane load hone par
  // scroll position wahi rakho (warna screen jhatka khaati hai)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (scrollRestore.current !== null) {
      el.scrollTop = el.scrollHeight - scrollRestore.current;
      scrollRestore.current = null;
      return;
    }

    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, open]);

  // ---------- Load ----------
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMessages(projectId);
      stickToBottom.current = true;
      setMessages(res.data.data.messages);
      setHasMore(res.data.data.hasMore);
      setLoaded(true);
    } catch {
      // api.js toast dikha deta hai
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const firstReal = messages.find((m) => !m.pending);
    if (!firstReal) return;

    setLoadingOlder(true);
    const el = listRef.current;
    try {
      const res = await getMessages(projectId, firstReal._id);
      scrollRestore.current = el ? el.scrollHeight - el.scrollTop : null;
      stickToBottom.current = false;
      setMessages((prev) => [...res.data.data.messages, ...prev]);
      setHasMore(res.data.data.hasMore);
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false);
    }
  };

  // Project badalne par sab reset + unread count
  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    setOpen(false);
    setTypingUsers({});
    getUnreadCount(projectId)
      .then((res) => setUnread(res.data.data.count))
      .catch(() => {});
  }, [projectId]);

  // Panel khulte hi load + read mark
  useEffect(() => {
    if (!open) return;
    if (!loaded) loadInitial();
    setUnread(0);
    markChatRead(projectId).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, loaded, loadInitial, projectId]);

  // Esc se band
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ---------- Real-time ----------
  useEffect(() => {
    const handleMessage = (msg) => {
      if ((msg.project?._id || msg.project)?.toString() !== projectId) return;

      const fromMe = senderId(msg) === myId;

      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;

        // Mera hi bheja hua message -> "sending..." wale temp ko badal do
        if (fromMe) {
          const tempIndex = prev.findIndex((m) => m.pending && m.text === msg.text);
          if (tempIndex !== -1) {
            const copy = [...prev];
            copy[tempIndex] = msg;
            return copy;
          }
        }
        return [...prev, msg];
      });

      // Typing wala hata do (message aa gaya)
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[senderId(msg)];
        return next;
      });

      if (fromMe) return;

      if (openRef.current) {
        if (isNearBottom()) {
          stickToBottom.current = true;
        } else {
          stickToBottom.current = false;
          setShowJump(true);
        }
        markChatRead(projectId).catch(() => {});
      } else {
        setUnread((n) => n + 1);
        const name = msg.sender?.fullName || msg.sender?.username || "Someone";
        toast(`💬 ${name}: ${msg.text.slice(0, 60)}${msg.text.length > 60 ? "…" : ""}`, {
          id: `chat-${msg._id}`,
        });
      }
    };

    const handleDeleted = ({ projectId: pid, messageId }) => {
      if (pid?.toString() !== projectId) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleTyping = ({ projectId: pid, userId, name, isTyping }) => {
      if (pid?.toString() !== projectId || userId === myId) return;

      clearTimeout(typingTimers.current[userId]);

      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [userId]: name }));
        // Agar "stop" event na aaye (tab band ho gaya) to 5 sec baad khud hata do
        typingTimers.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 5000);
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    // Internet / server restart ke baad socket reconnect hota hai aur rooms
    // chhoot jaate hain -> project room dobara join karo, warna chat ruk jaati
    const handleReconnect = () => socket.emit("join-project", projectId);

    socket.on("chat-message", handleMessage);
    socket.on("chat-message-deleted", handleDeleted);
    socket.on("chat-typing", handleTyping);
    socket.on("connect", handleReconnect);

    const timers = typingTimers.current;
    return () => {
      socket.off("chat-message", handleMessage);
      socket.off("chat-message-deleted", handleDeleted);
      socket.off("chat-typing", handleTyping);
      socket.off("connect", handleReconnect);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [projectId, myId]);

  // ---------- Typing emit (2 sec me max ek baar) ----------
  const emitTyping = (isTyping) => {
    socket.emit("chat-typing", { projectId, isTyping });
  };

  const handleInput = (value) => {
    setText(value);

    const now = Date.now();
    if (value.trim() && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      emitTyping(true);
    }

    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      lastTypingSent.current = 0;
      emitTyping(false);
    }, 3000);
  };

  // Textarea apne aap bada ho (max 5 lines)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, open]);

  // ---------- Send ----------
  const handleSend = async () => {
    const value = text.trim();
    if (!value || value.length > MAX_LENGTH) return;

    const tempId = `temp-${Date.now()}`;
    const temp = {
      _id: tempId,
      text: value,
      sender: currentUser,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    stickToBottom.current = true;
    setMessages((prev) => [...prev, temp]);
    setText("");
    clearTimeout(stopTypingTimer.current);
    lastTypingSent.current = 0;
    emitTyping(false);

    try {
      const res = await sendMessage(projectId, value);
      const saved = res.data.data;
      setMessages((prev) => {
        // Socket pehle hi asli message le aaya ho to temp hata do
        if (prev.some((m) => m._id === saved._id)) {
          return prev.filter((m) => m._id !== tempId);
        }
        return prev.map((m) => (m._id === tempId ? saved : m));
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true } : m)),
      );
    }
  };

  const retrySend = (msg) => {
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
    setText(msg.text);
    inputRef.current?.focus();
  };

  const handleDelete = async (msg) => {
    if (!window.confirm("Delete this message?")) return;
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
    try {
      await deleteMessage(projectId, msg._id);
    } catch {
      setMessages(snapshot);
    }
  };

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop < 60) loadOlder();
    const near = isNearBottom();
    stickToBottom.current = near;
    if (near) setShowJump(false);
  };

  const typingNames = Object.values(typingUsers);
  const typingText =
    typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing`
        : typingNames.length > 2
          ? "Several people are typing"
          : "";

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open project chat"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 hover:bg-blue-700 animate-pop-in"
        >
          <MessageCircle size={24} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold ring-2 ring-white dark:ring-slate-950">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <>
          {/* Mobile par peeche ka dhundla background */}
          <div
            className="fixed inset-0 z-40 bg-black/30 animate-fade-in sm:hidden"
            onClick={() => setOpen(false)}
          />

          <aside
            className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[420px] dark:border-slate-800 dark:bg-slate-900"
            style={{ animation: "chat-slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) backwards" }}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <MessageCircle size={18} className="text-blue-600" />
                  Project Chat
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {projectName}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </header>

            {/* Messages */}
            <div className="relative flex-1 overflow-hidden">
              <div
                ref={listRef}
                onScroll={onScroll}
                className="h-full overflow-y-auto px-4 py-4"
              >
                {loading ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin" size={22} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 animate-fade-in">
                    <MessageCircle size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm">Team ko pehla message bhejo 👋</p>
                  </div>
                ) : (
                  <>
                    {hasMore && (
                      <div className="mb-3 flex justify-center">
                        <button
                          onClick={loadOlder}
                          disabled={loadingOlder}
                          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {loadingOlder && <Loader2 size={12} className="animate-spin" />}
                          Load older messages
                        </button>
                      </div>
                    )}

                    {messages.map((msg, index) => {
                      const prev = messages[index - 1];
                      const mine = senderId(msg) === myId;
                      const newDay = !prev || !sameDay(prev.createdAt, msg.createdAt);
                      const grouped =
                        !newDay &&
                        prev &&
                        senderId(prev) === senderId(msg) &&
                        new Date(msg.createdAt) - new Date(prev.createdAt) < GROUP_GAP_MS;
                      const canDelete = !msg.pending && !msg.failed && (mine || isAdmin);

                      return (
                        <div key={msg._id}>
                          {newDay && (
                            <div className="my-4 flex items-center gap-3">
                              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                {dayLabel(msg.createdAt)}
                              </span>
                              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                            </div>
                          )}

                          <div
                            className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""} ${
                              grouped ? "mt-0.5" : "mt-3"
                            } animate-fade-in-up`}
                          >
                            {/* Avatar (group ke pehle message par hi) */}
                            <div className="w-8 shrink-0">
                              {!mine && !grouped && (
                                <img
                                  src={msg.sender?.avatar?.url || "https://placehold.co/40x40"}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              )}
                            </div>

                            <div className={`flex max-w-[75%] flex-col ${mine ? "items-end" : "items-start"}`}>
                              {!mine && !grouped && (
                                <span className="mb-1 px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  {msg.sender?.fullName || msg.sender?.username}
                                </span>
                              )}

                              <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                                <div
                                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                                    mine
                                      ? "rounded-br-md bg-blue-600 text-white"
                                      : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                                  } ${msg.pending ? "opacity-60" : ""} ${
                                    msg.failed ? "bg-red-500! text-white" : ""
                                  }`}
                                >
                                  {msg.text}
                                </div>

                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(msg)}
                                    aria-label="Delete message"
                                    className="rounded p-1 text-slate-400 opacity-0 transition hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>

                              <span className="mt-0.5 px-1 text-[10px] text-slate-400">
                                {msg.failed ? (
                                  <button
                                    onClick={() => retrySend(msg)}
                                    className="font-medium text-red-500 hover:underline"
                                  >
                                    Failed · tap to retry
                                  </button>
                                ) : msg.pending ? (
                                  "Sending…"
                                ) : (
                                  timeLabel(msg.createdAt)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {showJump && (
                <button
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-pop-in"
                >
                  <ArrowDown size={14} />
                  New messages
                </button>
              )}
            </div>

            {/* Typing indicator */}
            <div className="h-6 px-5 text-xs italic text-slate-500 dark:text-slate-400">
              {typingText && (
                <span className="flex items-center gap-1.5 animate-fade-in">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>
                  {typingText}
                </span>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  maxLength={MAX_LENGTH}
                  onChange={(e) => handleInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter = bhejo, Shift+Enter = nayi line
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  className="max-h-[120px] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-400">
                <span>Enter to send · Shift+Enter for new line</span>
                {text.length > MAX_LENGTH - 200 && (
                  <span className={text.length >= MAX_LENGTH ? "text-red-500" : ""}>
                    {text.length}/{MAX_LENGTH}
                  </span>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
