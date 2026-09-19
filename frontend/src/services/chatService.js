import api from "./api";

export const getMessages = (projectId, before) =>
  api.get(`/messages/${projectId}`, { params: { before, limit: 30 } });

export const sendMessage = (projectId, text) =>
  api.post(`/messages/${projectId}`, { text });

export const deleteMessage = (projectId, messageId) =>
  api.delete(`/messages/${projectId}/${messageId}`);

export const markChatRead = (projectId) =>
  api.post(`/messages/${projectId}/read`);

export const getUnreadCount = (projectId) =>
  api.get(`/messages/${projectId}/unread`);
