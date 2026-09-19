import api from "./api";


export const getNotes = (projectId) =>
  api.get(`/notes/${projectId}`);


export const createNote = (projectId, data) =>
  api.post(
    `/notes/${projectId}`,
    data
  );


export const updateNote = (projectId, noteId, data) =>
  api.put(
    `/notes/${projectId}/${noteId}`,
    data
  );


export const deleteNote = (projectId, noteId) =>
  api.delete(
    `/notes/${projectId}/${noteId}`
  );