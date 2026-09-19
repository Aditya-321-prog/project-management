import api from "./api";

export const getCurrentUser = () =>
  api.get("/auth/current-user");

export const updateAccount = (data) =>
  api.patch("/auth/update-account", data);

export const updateAvatar = (formData) =>
  api.patch("/auth/update-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const changePassword = (data) =>
  api.post("/auth/change-password", data);

export const logout = () =>
  api.post("/auth/logout");