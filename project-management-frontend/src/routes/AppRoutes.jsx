import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";
import PageLoader from "../components/common/PageLoader";

// Lazy loading: har page ka code tabhi download hota hai jab wo page khulta hai.
// Pehle poori app ek hi 700KB file me thi jo pehli baar me hi load hoti thi.
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const VerifyEmail = lazy(() => import("../pages/auth/VerifyEmail"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const Projects = lazy(() => import("../pages/projects/Projects"));
const CreateProject = lazy(() => import("../pages/projects/CreateProject"));
const ProjectDetails = lazy(() => import("../pages/projects/ProjectDetails"));
const TaskDetails = lazy(() => import("../pages/tasks/TaskDetails"));
const MyTasks = lazy(() => import("../pages/tasks/MyTasks"));

const withSuspense = (element) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Authentication */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={withSuspense(<Login />)} />
        <Route path="/register" element={withSuspense(<Register />)} />
        <Route path="/forgot-password" element={withSuspense(<ForgotPassword />)} />
        <Route
          path="/verify-email/:verificationToken"
          element={withSuspense(<VerifyEmail />)}
        />
        <Route
          path="/reset-password/:resetToken"
          element={withSuspense(<ResetPassword />)}
        />
      </Route>

      {/* Dashboard */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={withSuspense(<Dashboard />)} />
        <Route path="/profile" element={withSuspense(<Profile />)} />
        <Route path="/my-tasks" element={withSuspense(<MyTasks />)} />
        <Route path="/projects" element={withSuspense(<Projects />)} />
        <Route path="/projects/create" element={withSuspense(<CreateProject />)} />
        <Route path="/projects/:projectId" element={withSuspense(<ProjectDetails />)} />
        <Route
          path="/projects/:projectId/tasks/:taskId"
          element={withSuspense(<TaskDetails />)}
        />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
