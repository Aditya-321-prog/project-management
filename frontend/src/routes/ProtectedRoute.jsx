import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import PageLoader from "../components/common/PageLoader";

const Landing = lazy(() => import("../pages/landing/Landing"));

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="h-10 w-10 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return children;

  // Logged-out visitor "/" par aaye -> landing page (login page nahi)
  if (location.pathname === "/") {
    return (
      <Suspense fallback={<PageLoader />}>
        <Landing />
      </Suspense>
    );
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
