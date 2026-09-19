// Common config jo kai jagah use hota hai

export const isProduction = process.env.NODE_ENV === "production";

export const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Auth cookies ke options - ek hi jagah se, taaki login / google-login /
// refresh / logout sab me same settings rahe.
// Local (http) par secure:false + sameSite:lax chahiye (Safari me bhi chalega).
// Deploy par frontend aur backend alag domain par hote hain, tab
// secure:true + sameSite:none zaroori hai warna browser cookie block kar deta hai.
export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};
