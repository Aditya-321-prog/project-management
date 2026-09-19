import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Mail,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import ThemeToggle from "../../components/layout/ThemeToggle";

// ==========================================================
// Landing page (logged-out visitors ko "/" par dikhta hai)
// Hero me ek chhota asli board hai - card drag karke dekh sakte ho
// ==========================================================

const COLUMNS = [
  { key: "todo", label: "Todo", dot: "bg-slate-400" },
  { key: "in_progress", label: "In progress", dot: "bg-blue-600" },
  { key: "in_review", label: "In review", dot: "bg-amber-400" },
  { key: "done", label: "Done", dot: "bg-green-600" },
];

const PEOPLE = {
  mahima: { name: "Mahima", initials: "MS", tone: "bg-blue-600" },
  adi: { name: "Adi", initials: "AV", tone: "bg-violet-600" },
  aditya: { name: "Aditya", initials: "AS", tone: "bg-emerald-600" },
};

const INITIAL_CARDS = [
  { id: "faq", title: "Write FAQ content", column: "todo", priority: "low", person: "adi", due: "Due 5 Oct" },
  { id: "pay", title: "Set up payment gateway", column: "todo", priority: "high", person: "aditya", due: "Due 30 Sep" },
  { id: "banner", title: "Design homepage banner", column: "in_progress", priority: "high", person: "adi", due: "Overdue by 3 days", overdue: true },
  { id: "form", title: "Event registration form", column: "in_progress", priority: "high", person: "aditya", due: "Due today", soon: true },
  { id: "sponsors", title: "Sponsors section with logos", column: "in_review", priority: "medium", person: "adi", due: "Due tomorrow", soon: true },
  { id: "speakers", title: "Speaker bios page", column: "in_review", priority: "low", person: "aditya", due: "Due 25 Sep" },
  { id: "schedule", title: "Event schedule page", column: "done", priority: "medium", person: "aditya", due: "Completed" },
];

const PRIORITY_COLOR = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-green-600 dark:text-green-400",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F1B2D] dark:bg-slate-950 dark:text-slate-100">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

// ----------------------------------------------------------
function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="ProjectCamp home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-display text-sm font-bold text-white">
        PC
      </span>
      <span className="font-display text-lg font-bold tracking-tight">ProjectCamp</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#DCE3ED]/70 bg-[#F5F7FA]/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex dark:text-slate-300">
          <a href="#how" className="hover:text-blue-600">How it works</a>
          <a href="#features" className="hover:text-blue-600">Features</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white sm:block dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------
function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-12 lg:gap-10 lg:pt-20">
      <div className="min-w-0 lg:col-span-5">
        <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
          From assigned to approved, in one place.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          ProjectCamp is a shared board for small teams. Assign tasks with deadlines, collect the work,
          review it with feedback, and see every change the moment it happens.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
          >
            Create a free account
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-[#DCE3ED] bg-white px-6 py-3.5 font-semibold text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Log in
          </Link>
        </div>
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          Try the board: drag a card to another column.
        </p>
      </div>

      {/* min-w-0: warna board (640px) poore page ko mobile par chauda kar deta */}
      <div className="min-w-0 lg:col-span-7">
        <DemoBoard />
      </div>
    </section>
  );
}

// Hero ka board - ek baar ka animation + khud drag kar sakte ho
function DemoBoard() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [landedId, setLandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const toastTimer = useRef(null);

  const move = (id, column, message) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.column === column) return prev;
      const rest = prev.filter((c) => c.id !== id);
      const updated = {
        ...card,
        column,
        due: column === "done" ? "Completed" : card.due === "Completed" ? "Due next week" : card.due,
        overdue: column === "done" ? false : card.overdue,
        soon: column === "done" ? false : card.soon,
      };
      return [...rest, updated];
    });
    setLandedId(id);
    if (message) {
      clearTimeout(toastTimer.current);
      setToast(message);
      toastTimer.current = setTimeout(() => setToast(null), 3200);
    }
  };

  // Page khulne par ek hi moment: review wala card approve hokar Done me
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const t = setTimeout(
      () => move("sponsors", "done", { title: "Approved", text: "Mahima: “Logos look sharp. Ship it.”" }),
      1400,
    );
    return () => {
      clearTimeout(t);
      clearTimeout(toastTimer.current);
    };
  }, []);

  const nextColumn = (column) => {
    const i = COLUMNS.findIndex((c) => c.key === column);
    return COLUMNS[(i + 1) % COLUMNS.length].key;
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-[1.75rem] border border-[#DCE3ED] bg-white shadow-[0_30px_60px_-30px_rgba(15,27,45,0.35)] dark:border-slate-800 dark:bg-slate-900"
        aria-label="Example project board"
      >
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-[#DCE3ED] px-5 py-3 dark:border-slate-800">
          <div>
            <p className="font-display text-sm font-bold">TechFest 2026 Website</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">3 members</p>
          </div>
          <div className="flex -space-x-2">
            {Object.values(PEOPLE).map((p) => (
              <span
                key={p.name}
                title={p.name}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 ${p.tone}`}
              >
                {p.initials}
              </span>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-4 gap-3 bg-[#F5F7FA] p-3 dark:bg-slate-950/50">
            {COLUMNS.map((col) => {
              const list = cards.filter((c) => c.column === col.key);
              const isOver = overCol === col.key && dragId;
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(col.key);
                  }}
                  onDragLeave={() => setOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) move(dragId, col.key);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`min-h-[300px] rounded-2xl p-2 transition-colors ${
                    isOver ? "bg-blue-100/70 dark:bg-blue-950/50" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      {col.label}
                    </span>
                    <span className="text-xs text-slate-400">{list.length}</span>
                  </div>

                  <div className="space-y-2">
                    {list.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragId(card.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverCol(null);
                        }}
                        onClick={() => move(card.id, nextColumn(card.column))}
                        title="Drag, or click to move to the next column"
                        className={`block w-full cursor-grab rounded-xl border bg-white p-2.5 text-left shadow-sm active:cursor-grabbing dark:bg-slate-800 ${
                          card.overdue
                            ? "border-l-4 border-slate-200 border-l-red-500 dark:border-slate-700"
                            : "border-slate-200 dark:border-slate-700"
                        } ${landedId === card.id ? "lp-land" : ""} ${dragId === card.id ? "opacity-40" : ""}`}
                      >
                        <span
                          className={`block text-[13px] font-semibold leading-snug ${
                            card.column === "done" ? "text-slate-400 line-through" : ""
                          }`}
                        >
                          {card.title}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className={`flex items-center gap-1 text-[11px] font-medium capitalize ${PRIORITY_COLOR[card.priority]}`}>
                            <Flag size={11} />
                            {card.priority}
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white ${PEOPLE[card.person].tone}`}
                          >
                            {PEOPLE[card.person].initials}
                          </span>
                        </span>
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            card.overdue
                              ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                              : card.soon
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                : card.column === "done"
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {card.overdue ? <AlertTriangle size={10} /> : card.column === "done" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {card.due}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Approved toast */}
      <div aria-live="polite" className="pointer-events-none absolute -bottom-9 left-5 right-5 sm:left-auto sm:right-6 sm:w-72">
        {toast && (
          <div className="lp-pop flex items-start gap-3 rounded-2xl border border-green-200 bg-white p-3.5 shadow-xl dark:border-green-900 dark:bg-slate-900">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{toast.text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
const STEPS = [
  {
    title: "Create a project",
    text: "Name it, then invite your team by email. You are the admin; everyone else joins as a member.",
  },
  {
    title: "Assign the work",
    text: "Each task gets an owner, a priority and a due date, plus any files or links they need.",
  },
  {
    title: "Submit and review",
    text: "Members upload their work with a note. Admins approve it or ask for changes with clear feedback.",
  },
  {
    title: "Track progress",
    text: "Deadline reminders go out every morning, and the analytics page shows who is ahead and what is late.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-[#DCE3ED] bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          How a task moves through your team
        </h2>

        <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
          {/* Jodne wali line (sirf desktop) */}
          <span aria-hidden="true" className="absolute left-5 right-[calc(25%-2.375rem)] top-5 hidden h-0.5 bg-[#DCE3ED] md:block dark:bg-slate-700" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold ring-8 ring-white dark:ring-slate-900 ${
                  i === STEPS.length - 1
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ----------------------------------------------------------
function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 space-y-24 px-5 py-24">
      <FeatureRow
        title="Reviews that say what to fix"
        text="Members submit files with a short note. Admins approve, or request changes, and feedback is required when they do. Every attempt stays in the history, so nobody has to ask what changed."
        visual={<ReviewVisual />}
      />
      <FeatureRow
        reverse
        title="Everyone works from the same board, live"
        text="Move a card and it moves on every teammate's screen. Each project has its own chat with typing indicators and unread counts, and comments on each task keep decisions next to the work."
        visual={<ChatVisual />}
      />
      <FeatureRow
        title="Deadlines don't sneak up on anyone"
        text="Each morning, people get one email listing what is due today, due tomorrow and overdue. Admins hear about overdue tasks they assigned. Turn the emails off anytime from your profile."
        visual={<ReminderVisual />}
      />
      <FeatureRow
        reverse
        title="See where the project stands"
        text="Completion rate, on-time rate, average time to finish and each member's workload, for the last 7, 30 or 90 days. Download it all as a PDF report or a CSV for your spreadsheet."
        visual={<AnalyticsVisual />}
      />

      <div className="border-t border-[#DCE3ED] pt-12 dark:border-slate-800">
        <h3 className="font-display text-xl font-bold">Also included</h3>
        <ul className="mt-5 grid gap-x-10 gap-y-3 text-[15px] text-slate-600 sm:grid-cols-2 lg:grid-cols-3 dark:text-slate-300">
          {[
            "My Tasks: everything assigned to you, across projects",
            "Smart sorting that puts overdue work first",
            "Checklists inside every task",
            "Project notes and a full activity log",
            "File attachments and links on tasks",
            "Google sign-in, dark mode and mobile layout",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeatureRow({ title, text, visual, reverse = false }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`min-w-0 ${reverse ? "lg:order-2" : ""}`}>
        <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-4 max-w-[36rem] text-lg leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
      </div>
      <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>{visual}</div>
    </div>
  );
}

// Chhote UI "vignettes" - asli app jaise dikhte hain
function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-[#DCE3ED] bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

function ReviewVisual() {
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">AV</span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Adi <span className="font-normal text-slate-400">· Attempt 2</span></p>
          <p className="text-xs text-slate-500">Submitted 10 minutes ago</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          Waiting for review
        </span>
      </div>
      <p className="mt-4 rounded-xl bg-[#F5F7FA] px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        “Made the Register button bigger, as asked.”
      </p>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#DCE3ED] p-2.5 dark:border-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-950/40">
          <FileText size={17} />
        </span>
        <span className="text-sm font-medium">banner-dark-v2.pdf</span>
        <span className="ml-auto text-xs text-slate-400">1.8 MB</span>
      </div>
      <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-3 dark:bg-red-950/30">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mahima · Attempt 1</p>
        <p className="mt-1 text-sm">Dark version works. Make the Register button bigger.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <span className="flex items-center gap-1.5 rounded-xl border border-red-300 px-3.5 py-2 text-sm font-semibold text-red-600 dark:border-red-900 dark:text-red-400">
          <RotateCcw size={14} /> Request changes
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-semibold text-white">
          <CheckCircle2 size={14} /> Approve
        </span>
      </div>
    </Panel>
  );
}

function ChatVisual() {
  const messages = [
    { who: "adi", text: "Where's the final logo file?" },
    { who: "mahima", text: "Attached it to the Sponsors task 👍", mine: true },
    { who: "aditya", text: "Registration form is live on staging" },
  ];
  return (
    <Panel className="space-y-3">
      <div className="flex items-center gap-2 border-b border-[#DCE3ED] pb-3 dark:border-slate-800">
        <MessageCircle size={17} className="text-blue-600" />
        <p className="text-sm font-semibold">Project chat</p>
        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">2 new</span>
      </div>
      {messages.map((m, i) => (
        <div key={i} className={`flex items-end gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
          {!m.mine && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${PEOPLE[m.who].tone}`}>
              {PEOPLE[m.who].initials}
            </span>
          )}
          <p
            className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
              m.mine
                ? "rounded-br-md bg-blue-600 text-white"
                : "rounded-bl-md bg-[#F5F7FA] dark:bg-slate-800"
            }`}
          >
            {m.text}
          </p>
        </div>
      ))}
      <p className="flex items-center gap-1.5 pl-9 text-xs italic text-slate-500">
        <span className="flex gap-0.5">
          <span className="lp-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="lp-dot h-1.5 w-1.5 rounded-full bg-slate-400 [animation-delay:0.15s]" />
          <span className="lp-dot h-1.5 w-1.5 rounded-full bg-slate-400 [animation-delay:0.3s]" />
        </span>
        Adi is typing
      </p>
    </Panel>
  );
}

function ReminderVisual() {
  const rows = [
    { task: "Design homepage banner", project: "TechFest 2026", when: "3 days ago", late: true },
    { task: "Event registration form", project: "TechFest 2026", when: "Today" },
    { task: "Sponsors section", project: "TechFest 2026", when: "Tomorrow" },
  ];
  return (
    <Panel>
      <div className="flex items-center gap-3 border-b border-[#DCE3ED] pb-3 dark:border-slate-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50">
          <Mail size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold">1 task overdue + 2 due soon</p>
          <p className="text-xs text-slate-500">ProjectCamp · 9:00 AM</p>
        </div>
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="py-1.5 font-medium">Task</th>
            <th className="py-1.5 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.task} className="border-t border-[#DCE3ED] dark:border-slate-800">
              <td className="py-2.5">
                <p className="font-medium">{r.task}</p>
                <p className="text-xs text-slate-400">{r.project}</p>
              </td>
              <td className={`py-2.5 font-semibold ${r.late ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                {r.when}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function AnalyticsVisual() {
  const bars = [3, 5, 2, 6, 4, 7, 5];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <Panel>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Completion", value: "62%", color: "text-green-600 dark:text-green-400" },
          { label: "On time", value: "84%", color: "text-blue-600 dark:text-blue-400" },
          { label: "Overdue", value: "1", color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-[#F5F7FA] p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">Tasks completed this week</p>
      <div className="mt-2 flex h-28 items-end gap-2">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="w-full rounded-t-md bg-blue-600/85" style={{ height: `${(b / 7) * 88}px` }} />
            <span className="text-[10px] text-slate-400">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <span className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
          <FileText size={13} /> PDF report
        </span>
        <span className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
          <FileText size={13} /> CSV
        </span>
      </div>
    </Panel>
  );
}

// ----------------------------------------------------------
function FinalCta() {
  return (
    <section className="bg-blue-600 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Set up your first project in two minutes.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-blue-100">
            Free to use. Sign up with email or Google, invite your team, and assign the first task.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/register" className="rounded-xl bg-white px-6 py-3.5 font-semibold text-blue-700 hover:bg-blue-50">
            Create a free account
          </Link>
          <Link to="/login" className="rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 text-sm text-slate-500 sm:flex-row sm:items-center dark:text-slate-400">
      <Brand />
      <p>© {new Date().getFullYear()} ProjectCamp. Built with React, Node.js and MongoDB.</p>
      <a
        href="https://github.com/Aditya-321-prog/project-management"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 hover:text-blue-600"
      >
        <FaGithub size={16} /> Source on GitHub
      </a>
    </footer>
  );
}
