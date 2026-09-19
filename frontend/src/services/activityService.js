import api from "./api";

// { type: "all" | "tasks" | "members" | "comments" | "notes" | "project", before: <activityId> }
export const getProjectActivities = (projectId, { type = "all", before, limit = 20 } = {}) => {
    return api.get(`/activities/${projectId}`, {
        params: { type, before, limit },
    });
};
