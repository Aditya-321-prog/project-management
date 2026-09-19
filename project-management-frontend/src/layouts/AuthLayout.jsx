import { Outlet, useLocation } from "react-router-dom";

export default function AuthLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 via-blue-50 to-slate-100 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div key={location.pathname} className="w-full flex justify-center animate-pop-in">
        <Outlet />
      </div>
    </div>
  );
}
