import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 via-blue-50 to-slate-100 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Landing page par wapas */}
      <Link
        to="/"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-blue-600 sm:left-6 sm:top-6 dark:text-slate-300 dark:hover:bg-slate-900/70"
      >
        <ArrowLeft size={16} />
        ProjectCamp
      </Link>

      <div key={location.pathname} className="w-full flex justify-center animate-pop-in">
        <Outlet />
      </div>
    </div>
  );
}
