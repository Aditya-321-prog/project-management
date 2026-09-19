import api from "./api";

export const getSubtasks = (projectId, taskId) =>
  api.get(`/tasks/${projectId}/${taskId}/subtasks`);

export const createSubtask = (projectId, taskId, data) =>
  api.post(`/tasks/${projectId}/${taskId}/subtasks`, data);

export const updateSubtask = (projectId, taskId, subtaskId, data) =>
  api.put(
    `/tasks/${projectId}/${taskId}/subtasks/${subtaskId}`,
    data
  );

export const deleteSubtask = (projectId, taskId, subtaskId) =>
  api.delete(
    `/tasks/${projectId}/${taskId}/subtasks/${subtaskId}`
  );