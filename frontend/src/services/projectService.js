import api from "./api";


export const getProjects = () =>
  api.get("/projects");


export const createProject = (data) =>
  api.post("/projects", data);


export const getProjectById = (projectId) =>
  api.get(`/projects/${projectId}`);

export const updateProject = (projectId, data) =>
  api.put(`/projects/${projectId}`, data);


export const deleteProject = (projectId) =>
  api.delete(`/projects/${projectId}`);


export const getProjectMembers = (projectId) =>
  api.get(`/projects/${projectId}/members`);


export const addProjectMember = (projectId, data) =>
  api.post(`/projects/${projectId}/members`, data);


export const updateMemberRole = (
  projectId,
  userId,
  data
) =>
  api.put(
    `/projects/${projectId}/members/${userId}`,
    data
  );


export const removeProjectMember = (
  projectId,
  userId
) =>
  api.delete(
    `/projects/${projectId}/members/${userId}`
  );
// Analytics (range: 7 | 30 | 90 din)
export const getProjectAnalytics = (projectId, range = 30) =>
    api.get(`/projects/${projectId}/analytics`, { params: { range } });

// Report download (PDF / CSV) - file blob ke roop me aati hai
export const exportProjectReport = (projectId, format = "pdf", range = 30) =>
    api.get(`/projects/${projectId}/export`, {
        params: { format, range },
        responseType: "blob",
        // Error bhi blob me aata hai - page khud message dikhata hai
        skipErrorToast: true,
    });
