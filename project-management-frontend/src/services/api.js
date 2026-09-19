import axios from "axios";
import { toast } from "react-hot-toast";
import { API_BASE_URL, getErrorMessage } from "../lib/config";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// Auto token refresh
// Access token 1 din me expire hota hai. Pehle uske baad saari
// requests 401 deti thi aur app "khaali" dikhti thi.
// Ab 401 aane par ek baar refresh-token call hota hai aur
// original request dobara chal jaati hai.
// ==========================================

const AUTH_ROUTES_WITHOUT_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/google-login",
  "/auth/refresh-token",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

let refreshPromise = null;

const refreshSession = () => {
  // Ek saath 5 requests fail ho to refresh sirf ek baar chale
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh-token", null, { skipErrorToast: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Pages auth store import karte hain -> circular import se bachne ke liye
// session khatam hone par ek event bhej dete hain
const notifySessionExpired = () => {
  window.dispatchEvent(new Event("session-expired"));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const url = config.url || "";

    const canRefresh =
      status === 401 &&
      !config._retry &&
      !AUTH_ROUTES_WITHOUT_REFRESH.some((route) => url.startsWith(route));

    if (canRefresh) {
      config._retry = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        notifySessionExpired();
        return Promise.reject(error);
      }
    }

    // Create / update / delete fail hone par user ko batao
    // (pehle zyada tar jagah sirf console.log hota tha - user ko pata hi nahi chalta tha)
    const method = (config.method || "get").toLowerCase();
    const isMutation = method !== "get";
    const isAuthPage = url.startsWith("/auth/");

    if (isMutation && !isAuthPage && !config.skipErrorToast && status !== 401) {
      toast.error(getErrorMessage(error), { id: `err-${url}` });
    }

    return Promise.reject(error);
  },
);

export default api;
