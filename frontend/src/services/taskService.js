import api from "./api";


export const getTasks = (projectId) =>
    api.get(`/tasks/${projectId}`);

// Saare projects ke mere tasks. scope: "assigned" | "created"
export const getMyTasks = (scope = "assigned") =>
    api.get("/tasks/my", { params: { scope } });

export const getTaskById = (projectId, taskId) =>
    api.get(`/tasks/${projectId}/${taskId}`);

export const createTask = (projectId, formData) =>
    api.post(
        `/tasks/${projectId}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

// data FormData ho to multipart (files ke saath), warna normal JSON
export const updateTask = (projectId, taskId, data) =>
    api.put(
        `/tasks/${projectId}/${taskId}`,
        data,
        data instanceof FormData
            ? {
                headers: { "Content-Type": "multipart/form-data" },
                // Edit modal khud error dikhata hai - toast duplicate na ho
                skipErrorToast: true,
            }
            : undefined
    );


// Kanban drag & drop
export const updateTaskStatus = (projectId, taskId, status) =>
    api.patch(`/tasks/${projectId}/${taskId}/status`, { status });

export const deleteTask = (projectId, taskId) =>
    api.delete(`/tasks/${projectId}/${taskId}`);

export const submitTask = (projectId, taskId, formData) =>
    api.post(
        `/tasks/${projectId}/${taskId}/submit`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            // Submit form khud error dikhata hai
            skipErrorToast: true,
        }
    );
export const reviewTask = (
    projectId,
    taskId,
    data
) =>
    api.patch(
        `/tasks/${projectId}/${taskId}/review`,
        data,
        { skipErrorToast: true }
    );