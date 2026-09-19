import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  ListTodo,
  Target,
  Timer,
  UserX,
} from "lucide-react";

import {
  exportProjectReport,
  getProjectAnalytics,
  getProjectById,
} from "../../services/projectService";
import { blobErrorMessage, saveBlobResponse } from "../../lib/download";
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../store/themeStore";
import { PageSkeleton } from "../../components/common/Skeleton";
import CountUp from "../../components/common/CountUp";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const STATUS_META = [
  { key: "todo", label: "Todo", color: "#94a3b8" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "in_review", label: "In Review", color: "#eab308" },
  { key: "completed", label: "Completed", color: "#22c55e" },
];

const PRIORITY_META = [
  { key: "high", label: "High", color: "#ef4444" },
  { key: "medium", label: "Medium", color: "#f59e0b" },
  { key: "low", label: "Low", color: "#22c55e" },
];

const formatDay = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function ProjectAnalytics() {
  const { projectId } = useParams();
  const dark = useThemeStore((state) => state.dark);

  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(null); // "pdf" | "csv" | null

  const handleExport = async (format) => {
    setExporting(format);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} report…`);
    try {
      const res = await exportProjectReport(projectId, format, range);
      const name = saveBlobResponse(res, `project-report.${format}`);
      toast.success(`Downloaded ${name}`, { id: toastId });
    } catch (error) {
      toast.error(await blobErrorMessage(error), { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    getProjectById(projectId)
      .then((res) => setProjectName(res.data.data.project?.name || ""))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);

    getProjectAnalytics(projectId, range)
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, range]);

  // Dark mode me charts ke rang
  const theme = useMemo(
    () => ({
      text: dark ? "#cbd5e1" : "#475569",
      grid: dark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.12)",
      card: dark ? "#0f172a" : "#ffffff",
    }),
    [dark],
  );

  const baseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: theme.text, usePointStyle: true, boxWidth: 8 } },
        tooltip: { padding: 10, cornerRadius: 8 },
      },
    }),
    [theme],
  );

  const axisOptions = useMemo(
    () => ({
      ...baseOptions,
      scales: {
        x: { ticks: { color: theme.text }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: theme.text, precision: 0 },
          grid: { color: theme.grid },
        },
      },
    }),
    [baseOptions, theme],
  );

  if (loading) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Analytics load nahi ho paaye.</p>
        <Link to={`/projects/${projectId}`} className="mt-3 inline-block text-blue-600 hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  const { summary, statusBreakdown, priorityBreakdown, trend, members, bucket } = data;
  const empty = summary.total === 0;

  // ---------- Chart data ----------
  const statusChart = {
    labels: STATUS_META.map((s) => s.label),
    datasets: [
      {
        data: STATUS_META.map((s) => statusBreakdown[s.key] || 0),
        backgroundColor: STATUS_META.map((s) => s.color),
        borderColor: theme.card,
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const priorityChart = {
    labels: PRIORITY_META.map((p) => p.label),
    datasets: [
      {
        label: "Open tasks",
        data: PRIORITY_META.map((p) => priorityBreakdown[p.key] || 0),
        backgroundColor: PRIORITY_META.map((p) => `${p.color}cc`),
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };

  const trendChart = {
    labels: trend.map((b) =>
      bucket === "week" ? `${formatDay(b.start)}–${formatDay(b.end)}` : formatDay(b.start),
    ),
    datasets: [
      {
        label: "Created",
        data: trend.map((b) => b.created),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: range === 7 ? 4 : 2,
      },
      {
        label: "Completed",
        data: trend.map((b) => b.completed),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: range === 7 ? 4 : 2,
      },
    ],
  };

  const chartMembers = members.filter((m) => m.assigned > 0).slice(0, 10);
  const memberChart = {
    labels: chartMembers.map((m) => m.user.fullName || m.user.username),
    datasets: [
      {
        label: "Completed",
        data: chartMembers.map((m) => m.completed),
        backgroundColor: "#22c55ecc",
        borderRadius: 6,
        stack: "tasks",
      },
      {
        label: "In progress / todo",
        data: chartMembers.map((m) => m.active - m.overdue),
        backgroundColor: "#3b82f6cc",
        borderRadius: 6,
        stack: "tasks",
      },
      {
        label: "Overdue",
        data: chartMembers.map((m) => m.overdue),
        backgroundColor: "#ef4444cc",
        borderRadius: 6,
        stack: "tasks",
      },
    ],
  };

  const memberChartOptions = {
    ...axisOptions,
    indexAxis: "y",
    scales: {
      x: { ...axisOptions.scales.y, stacked: true },
      y: { ...axisOptions.scales.x, stacked: true },
    },
  };

  const cards = [
    { label: "Total tasks", value: summary.total, icon: ListTodo, color: "text-slate-700 dark:text-slate-200" },
    {
      label: "Completion",
      value: summary.completionRate,
      suffix: "%",
      icon: Target,
      color: "text-green-600 dark:text-green-400",
      hint: `${summary.completed} of ${summary.total} done`,
    },
    {
      label: "Overdue",
      value: summary.overdue,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Due this week",
      value: summary.dueThisWeek,
      icon: CalendarClock,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: `Completed (${range}d)`,
      value: summary.completedInRange,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      hint: `${summary.createdInRange} created in same period`,
    },
    {
      label: "On-time rate",
      value: summary.onTimeRate,
      suffix: "%",
      icon: Clock3,
      color: "text-blue-600 dark:text-blue-400",
      hint: "Deadline se pehle complete",
    },
    {
      label: "Avg. time to finish",
      value: summary.avgDaysToComplete,
      suffix: " days",
      decimals: true,
      icon: Timer,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Unassigned",
      value: summary.unassigned,
      icon: UserX,
      color: "text-slate-600 dark:text-slate-300",
      hint: "Open tasks bina member ke",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to={`/projects/${projectId}`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <ArrowLeft size={16} />
            {projectName || "Back to project"}
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
            Analytics
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Team ka progress, deadlines aur workload ek nazar me
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                range === r.value
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Report download */}
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-sm text-slate-500 dark:text-slate-400 md:flex">
            <Download size={15} />
            Export
          </span>
          {[
            { format: "pdf", label: "PDF", Icon: FileText, style: "bg-red-600 hover:bg-red-700" },
            { format: "csv", label: "CSV", Icon: FileSpreadsheet, style: "bg-green-600 hover:bg-green-700" },
          ].map(({ format, label, Icon, style }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={Boolean(exporting)}
              title={format === "pdf" ? "Summary, charts aur saare tasks ki report" : "Saare tasks - Excel / Google Sheets me kholo"}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${style}`}
            >
              {exporting === format ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Abhi koi task nahi hai</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Tasks banne ke baad yahan charts aur stats dikhenge.
          </p>
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{card.label}</span>
                    <Icon size={18} className={card.color} />
                  </div>
                  <p className={`mt-3 text-3xl font-extrabold ${card.color}`}>
                    {card.value === null || card.value === undefined ? (
                      "—"
                    ) : card.decimals ? (
                      card.value
                    ) : (
                      <CountUp value={card.value} />
                    )}
                    {card.value !== null && card.value !== undefined && card.suffix && (
                      <span className="text-lg font-bold">{card.suffix}</span>
                    )}
                  </p>
                  {card.hint && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.hint}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trend */}
          <ChartCard
            title="Created vs Completed"
            subtitle={bucket === "week" ? "Har hafte" : "Har din"}
          >
            <div className="h-72">
              <Line data={trendChart} options={axisOptions} />
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Tasks by status" subtitle="Saare tasks">
              <div className="h-64">
                <Doughnut
                  data={statusChart}
                  options={{
                    ...baseOptions,
                    cutout: "68%",
                    plugins: {
                      ...baseOptions.plugins,
                      legend: { ...baseOptions.plugins.legend, position: "right" },
                    },
                  }}
                />
              </div>
            </ChartCard>

            <ChartCard title="Open tasks by priority" subtitle="Jo abhi complete nahi hue">
              <div className="h-64">
                <Bar
                  data={priorityChart}
                  options={{
                    ...axisOptions,
                    plugins: { ...axisOptions.plugins, legend: { display: false } },
                  }}
                />
              </div>
            </ChartCard>
          </div>

          {/* Members */}
          {chartMembers.length > 0 && (
            <ChartCard title="Workload by member" subtitle="Completed, baaki aur overdue tasks">
              <div style={{ height: Math.max(180, chartMembers.length * 48) }}>
                <Bar data={memberChart} options={memberChartOptions} />
              </div>
            </ChartCard>
          )}

          <ChartCard title="Team performance" subtitle={`Pichhle ${range} din me completed ke hisaab se`}>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-2 py-3 font-medium">Member</th>
                    <th className="px-2 py-3 font-medium">Assigned</th>
                    <th className="px-2 py-3 font-medium">Done ({range}d)</th>
                    <th className="px-2 py-3 font-medium">Overdue</th>
                    <th className="px-2 py-3 font-medium">On-time</th>
                    <th className="px-2 py-3 font-medium">Activity</th>
                    <th className="px-2 py-3 font-medium w-40">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, index) => (
                    <tr
                      key={m.user._id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60 animate-fade-in-up"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.user.avatar?.url || "https://placehold.co/40x40"}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {m.user.fullName || m.user.username}
                            </p>
                            <p className="text-xs capitalize text-slate-400">{m.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-700 dark:text-slate-300">{m.assigned}</td>
                      <td className="px-2 py-3 font-semibold text-green-600 dark:text-green-400">
                        {m.completedInRange}
                      </td>
                      <td className="px-2 py-3">
                        {m.overdue > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                            {m.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-slate-700 dark:text-slate-300">
                        {m.onTimeRate === null ? "—" : `${m.onTimeRate}%`}
                      </td>
                      <td className="px-2 py-3 text-slate-700 dark:text-slate-300">{m.activity}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all duration-700"
                              style={{ width: `${m.completionRate}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-slate-500 dark:text-slate-400">
                            {m.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <p className="text-right text-xs text-slate-400">
            Updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-fade-in-up">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
