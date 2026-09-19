// ==========================================================
// Backend ke address
//
// Local:      API aur socket dono -> http://localhost:8000
// Deploy par: API -> "/api/v1" (isi website se; vercel.json use Render par
//             bhej deta hai, isliye login cookie "apni" rehti hai aur
//             Safari / iPhone par bhi login chalta hai)
//             Socket -> seedha Render (VITE_API_URL)
// ==========================================================

const LOCAL_BACKEND = "http://localhost:8000";

// Socket (aur local API) ke liye backend ka poora URL
export const BACKEND_URL = (
  import.meta.env.VITE_API_URL || LOCAL_BACKEND
).replace(/\/+$/, "");

// Production build me by default proxy ("/api/v1").
// Proxy na chahiye to VITE_USE_API_PROXY=false rakho.
const useProxy =
  import.meta.env.PROD && import.meta.env.VITE_USE_API_PROXY !== "false";

export const API_BASE_URL = useProxy ? "/api/v1" : `${BACKEND_URL}/api/v1`;

// Backend error se user ko dikhane layak message nikalna
export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error?.response) return "Unable to connect to server";
  return error.response.data?.message || fallback;
};
