import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

export default function DashboardLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Right Side */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {/* Page badalne par halka fade/slide (key se har page naya animate hota hai) */}
          <div key={location.pathname} className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
