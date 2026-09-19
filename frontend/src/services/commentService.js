import api from "./api";

export const getComments = (
    projectId,
    taskId
) =>
    api.get(
        `/comments/${projectId}/${taskId}`
    );

export const createComment = (
    projectId,
    taskId,
    data
) =>
    api.post(
        `/comments/${projectId}/${taskId}`,
        data
    );

export const deleteComment = (
    projectId,
    taskId,
    commentId
) =>
    api.delete(
        `/comments/${projectId}/${taskId}/${commentId}`
    );