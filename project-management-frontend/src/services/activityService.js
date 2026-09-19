import api from "./api";

export const getProjectActivities = (projectId) => {
    return api.get(`/activities/${projectId}`);
};