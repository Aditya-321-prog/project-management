import { create } from "zustand";

import {
    getProjects,
    updateProject,
    deleteProject,
} from "../services/projectService";



export const useProjectStore = create((set) => ({

    projects: [],

    loading: false,


    fetchProjects: async () => {

        try {

            set({
                loading: true
            });

            const res = await getProjects();

            console.log("PROJECT RESPONSE:", res.data);

            set({
                projects: res.data.data,
            });

        }
        catch (error) {

            console.log(error);

        }
        finally {

            set({
                loading: false
            });

        }

    },


    editProject: async (projectId, data) => {

        try {

            const res = await updateProject(
                projectId,
                data
            );

            const updatedProject = res.data.data;

            set((state) => ({
                projects: state.projects.map((item) =>
                    item.project._id === updatedProject._id
                        ? {
                            ...item,
                            project: updatedProject
                        }
                        : item
                )
            }));

            return updatedProject;

        }
        catch (error) {

            console.log(error);

            throw error;

        }

    },


    removeProject: async (projectId) => {

        try {

            await deleteProject(projectId);

            set((state) => ({
                projects: state.projects.filter(
                    (item) =>
                        item.project._id !== projectId
                )
            }));

        }
        catch (error) {

            console.log(error);

            throw error;

        }

    },


    // 🔥 Real-time project created
    addProjectRealtime: (newProject) => {

        set((state) => ({

            projects: [
                {
                    project: newProject
                },
                ...state.projects,
            ]

        }));

    },


    // 🔥 Real-time project updated
    updateProjectRealtime: (updatedProject) => {

        set((state) => ({

            projects: state.projects.map((item) =>
                item.project._id === updatedProject._id
                    ? {
                        ...item,
                        project: updatedProject
                    }
                    : item
            )

        }));

    },


    // 🔥 Real-time project deleted
    deleteProjectRealtime: (projectId) => {

        set((state) => ({

            projects: state.projects.filter(
                (item) =>
                    item.project._id !== projectId
            )

        }));

    },


}));