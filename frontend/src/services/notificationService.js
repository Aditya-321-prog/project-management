import api from "./api";

export const getNotifications = () =>
  api.get("/notifications");

export const markAsRead = (notificationId) =>
  api.put(`/notifications/${notificationId}/read`);

export const markAllAsRead = () =>
  api.put("/notifications/read-all");