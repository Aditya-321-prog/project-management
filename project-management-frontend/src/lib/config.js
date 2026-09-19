// Backend ka address ek hi jagah se. Deploy karte waqt frontend .env me
// VITE_API_URL=https://tumhara-backend.onrender.com  daal dena.
export const BACKEND_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

// Backend error se user ko dikhane layak message nikalna
export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error?.response) return "Unable to connect to server";
  return error.response.data?.message || fallback;
};
