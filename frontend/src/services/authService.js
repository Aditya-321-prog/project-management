import api from "./api";

export const registerUser = (data) =>
  api.post("/auth/register", data);

export const loginUser = (data) =>
  api.post("/auth/login", data);

export const logoutUser = () =>
  api.post("/auth/logout");

export const getCurrentUser = () =>
  api.get("/auth/current-user");

export const refreshAccessToken = () =>
  api.post("/auth/refresh-token");

export const changePassword = (data) =>
  api.post("/auth/change-password", data);

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (token, data) =>
  api.post(`/auth/reset-password/${token}`, data);

export const verifyEmail = (token) =>
  api.get(`/auth/verify-email/${token}`);

export const resendEmailVerification = () =>
  api.post("/auth/resend-email-verification");

export const updateAccount = (data) => {
  return api.patch("/auth/update-account", data);
};

export const updateAvatar = (formData) => {
  return api.patch(
    "/auth/update-avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

// { emailReminders: true/false }
export const updatePreferences = (data) =>
  api.patch("/auth/preferences", data);

export const googleLogin = (token) =>
    api.post("/auth/google-login", {
        token,
    });

