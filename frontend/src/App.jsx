import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearSession = useAuthStore((state) => state.clearSession);
  const dark = useThemeStore((state) => state.dark);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Theme poori app par (pehle sirf Navbar ke andar lagti thi,
  // isliye login page par dark mode nahi aata tha)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // api.js se aata hai jab refresh token bhi expire ho jaye
  useEffect(() => {
    const handleExpired = () => {
      // BUG FIX: pehli baar aane wale (logged-out) visitor ke liye bhi
      // checkAuth -> 401 -> refresh fail -> ye event aata tha, aur landing
      // page ki jagah seedha login page khul jaata tha.
      // Ab login page par sirf tab bhejo jab user sach me logged in tha.
      const wasLoggedIn = useAuthStore.getState().isAuthenticated;
      clearSession();
      if (wasLoggedIn) {
        navigate("/login", { replace: true });
      }
    };
    window.addEventListener("session-expired", handleExpired);
    return () => window.removeEventListener("session-expired", handleExpired);
  }, [clearSession, navigate]);

  return (
    <>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          className:
            "!rounded-xl !text-sm !font-medium !shadow-lg dark:!bg-slate-800 dark:!text-slate-100",
        }}
      />
      <AppRoutes />
    </>
  );
}

export default App;
