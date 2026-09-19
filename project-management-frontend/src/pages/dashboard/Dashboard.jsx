import CountUp from "../../components/common/CountUp";
import { PageSkeleton } from "../../components/common/Skeleton";
import { useEffect, useState } from "react";
import { getDashboardStats } from "../../services/dashboardService";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Doughnut } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { useThemeStore } from "../../store/themeStore";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);



export default function Dashboard(){

   const { dark } = useThemeStore();



const [stats, setStats] = useState({
  projects: 0,
  tasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  members: 0,
  recentProjects: [],
  recentTasks: [],
});

const [loading, setLoading] = useState(true);


useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, []);


const chartData = {
  labels: ["Completed", "Pending"],
  datasets: [
    {
      data:
        stats.completedTasks + stats.pendingTasks === 0
          ? [1, 1]
          : [
              stats.completedTasks,
              stats.pendingTasks,
            ],
      backgroundColor: [
        "#22c55e",
        "#f59e0b",
      ],
      borderWidth: 0,
    },
  ],
};


const chartOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      position: "bottom",

      labels: {
        color: dark ? "#cbd5e1" : "#475569",
      },
    },
  },
};



if (loading) {
  return <PageSkeleton />;
}




return (
  <div className="space-y-8">

    <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
  Dashboard
</h1>

    <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-6 stagger">

      <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
  transition
  hover:shadow-xl
  hover:-translate-y-1
">
        <p className="text-gray-500 dark:text-slate-400">
  Projects
</p>
        <h2 className="text-5xl font-extrabold mt-4 text-slate-900 dark:text-white">
          <CountUp value={stats.projects} />
        </h2>
      </div>

      <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
  transition
  hover:shadow-xl
  hover:-translate-y-1
">
        <p className="text-gray-500 dark:text-slate-400">Tasks</p>
        <h2 className="text-5xl font-extrabold mt-4">
          <CountUp value={stats.tasks} />
        </h2>
      </div>

      <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
  transition
  hover:shadow-xl
  hover:-translate-y-1
">
        <p className="text-gray-500 dark:text-slate-400">Completed</p>
        <h2 className="text-4xl font-extrabold text-green-600 mt-4">
          <CountUp value={stats.completedTasks} />
        </h2>
      </div>

      <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
  transition
  hover:shadow-xl
  hover:-translate-y-1
">
        <p className="text-gray-500 dark:text-slate-400">Pending</p>
        <h2 className="text-4xl font-extrabold text-yellow-500 mt-4">
          <CountUp value={stats.pendingTasks} />
        </h2>
      </div>

      <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
  transition
  hover:shadow-xl
  hover:-translate-y-1
">
        <p className="text-gray-500 dark:text-slate-400">Teammates</p>
        <h2 className="text-4xl font-extrabold text-blue-600 mt-4">
          <CountUp value={stats.members} />
        </h2>
      </div>

    </div>
    <div className="grid lg:grid-cols-2 gap-6 mt-8">

  {/* Recent Projects */}

<div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
">


    <h2 className="text-xl font-semibold mb-5 text-slate-900 dark:text-white">
  Recent Projects
</h2>

    {
      stats.recentProjects.length === 0 ? (

        <p className="text-gray-500 dark:text-slate-400">
  No projects yet.
</p>

      ) : (

        stats.recentProjects.map((project)=>(

          <Link
    key={project._id}
    to={`/projects/${project._id}`}
     className="
  block
  rounded-lg
  hover:bg-gray-50
  dark:hover:bg-slate-800
  transition
"
>

            <div className="
      flex
      justify-between
      items-center
      border-b
      py-4
      px-2
      last:border-none
    ">

              <h3 className="font-medium text-slate-900 dark:text-slate-100">
  {project.name}
</h3>

              <p className="text-sm text-gray-500 dark:text-slate-400 truncate w-60">
  {project.description || "No description"}
</p>

            </div>

          </Link>

        ))

      )
    }

  </div>



  {/* Recent Tasks */}

  <div className="
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
">

    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Recent Tasks
      </h2>
      <Link
        to="/my-tasks"
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        View all →
      </Link>
    </div>

    {
      stats.recentTasks.length === 0 ? (

        <p className="text-gray-500 dark:text-slate-400">
  No tasks yet.
</p>

      ) : (

        stats.recentTasks.map((task)=>(

          <Link
    key={task._id}
    to={`/projects/${task.project?._id}/tasks/${task._id}`}
    className="
  block
  rounded-lg
  hover:bg-gray-50
  dark:hover:bg-slate-800
  transition
"
>

            <div className="
      flex
      justify-between
      items-center
      border-b
      py-4
      px-2
      last:border-none
    ">

             <h3 className="font-medium text-slate-900 dark:text-slate-100">
  {task.title}
</h3>

              <p className="text-sm text-gray-500 dark:text-slate-400">
  {task.project?.name || "Unknown Project"}
</p>

            </div>


            <span
              className={`
px-3
py-1
rounded-full
text-xs
font-medium
${
    task.status === "completed"
        ? "bg-green-100 text-green-700"
        : task.status === "in_progress"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-700"
}`
}
            >
              {task.status
    .replace("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase())}
            </span>

          </Link>

        ))

      )
    }

  </div>

</div>
  
  <div className="
  mt-8
  bg-white
  dark:bg-slate-900
  rounded-2xl
  border
  border-slate-200
  dark:border-slate-800
  p-6
">

  <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white">
  Task Progress
</h2>

  <div className="h-72 flex items-center justify-center">


    <div className="h-80">
    <Doughnut
        data={chartData}
        options={chartOptions}
    />
</div>

  </div>

</div>
  </div>
);

}