import { PageSkeleton } from "../../components/common/Skeleton";
import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { useProjectStore } from "../../store/projectstore.js";

import { useAuthStore } from "../../store/authStore.js";

import socket from "../../socket/socket";

export default function Projects() {

    const {
        projects,
        fetchProjects,
        loading,
        editProject,
        removeProject,
        addProjectRealtime,
        updateProjectRealtime,
        deleteProjectRealtime,
    } = useProjectStore();


    const currentUser = useAuthStore(
        (state) => state.user
    );


    // ==========================
    // Modal State
    // ==========================

    const [showEditModal, setShowEditModal] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);


    const [selectedProject, setSelectedProject] =
        useState(null);


    const [editName, setEditName] =
        useState("");

    const [editDescription, setEditDescription] =
        useState("");


    const [actionLoading, setActionLoading] =
        useState(false);


    // ==========================
    // Fetch Projects
    // ==========================

    useEffect(() => {

        fetchProjects();

    }, []);


    // ==========================
    // Socket - User Room
    // ==========================

    useEffect(() => {

        const handleProjectCreated = (newProject) => {

            console.log(
                "🔥 PROJECT CREATED:",
                newProject
            );

            addProjectRealtime(newProject);

        };


        const handleProjectUpdated = (updatedProject) => {

            console.log(
                "🔥 PROJECT UPDATED:",
                updatedProject
            );

            updateProjectRealtime(updatedProject);

        };


        const handleProjectDeleted = (data) => {

            console.log(
                "🔥 PROJECT DELETED:",
                data
            );

            deleteProjectRealtime(
                data.projectId
            );

        };


        socket.on(
            "project-created",
            handleProjectCreated
        );

        socket.on(
            "project-updated",
            handleProjectUpdated
        );

        socket.on(
            "project-deleted",
            handleProjectDeleted
        );


        return () => {

            socket.off(
                "project-created",
                handleProjectCreated
            );

            socket.off(
                "project-updated",
                handleProjectUpdated
            );

            socket.off(
                "project-deleted",
                handleProjectDeleted
            );

        };

    }, [
        addProjectRealtime,
        updateProjectRealtime,
        deleteProjectRealtime,
    ]);


    // ==========================
    // Open Edit Modal
    // ==========================

    const handleOpenEdit = (project) => {

        setSelectedProject(project);

        setEditName(project.name);

        setEditDescription(
            project.description || ""
        );

        setShowEditModal(true);

    };


    // ==========================
    // Edit Project
    // ==========================

    const handleEditProject = async (e) => {

        e.preventDefault();

        if (!editName.trim()) {
            return;
        }

        try {

            setActionLoading(true);

            await editProject(
                selectedProject._id,
                {
                    name: editName,
                    description: editDescription,
                }
            );

            setShowEditModal(false);

            setSelectedProject(null);

        }
        catch (error) {

            console.log(
                error.response?.data || error
            );

        }
        finally {

            setActionLoading(false);

        }

    };


    // ==========================
    // Open Delete Modal
    // ==========================

    const handleOpenDelete = (project) => {

        setSelectedProject(project);

        setShowDeleteModal(true);

    };


    // ==========================
    // Delete Project
    // ==========================

    const handleDeleteProject = async () => {

        try {

            setActionLoading(true);

            await removeProject(
                selectedProject._id
            );

            setShowDeleteModal(false);

            setSelectedProject(null);

        }
        catch (error) {

            console.log(
                error.response?.data || error
            );

        }
        finally {

            setActionLoading(false);

        }

    };


    // ==========================
    // Loading
    // ==========================

    if (loading) {
        return <PageSkeleton />;
    }


    return (

        <div className="space-y-8">


            {/* ==========================
                Header
            ========================== */}

            <div className="flex justify-between items-center">

                <h1 className="text-4xl font-bold">
                    Projects
                </h1>


                <Link
                    to="/projects/create"
                    className="
                        bg-blue-600
                        text-white
                        px-5
                        py-3
                        rounded-xl
                    "
                >
                    Create Project
                </Link>

            </div>


            {/* ==========================
                Projects
            ========================== */}

            <div
                className="
                    grid
                    md:grid-cols-2
                    xl:grid-cols-3
                    gap-6
                    stagger
                "
            >

                {projects.map((item) => {

                    const project = item.project;

                    const isAdmin =
                        item.role === "admin";


                    return (

                        <div
                            key={project._id}
                            className="
            bg-white
            dark:bg-slate-900
            border
            border-slate-200
            dark:border-slate-800
            rounded-2xl
            p-6
            relative
            transition-all
            duration-300
            hover:shadow-lg
            hover:-translate-y-1
            hover:border-blue-300
            dark:hover:border-blue-800
            dark:hover:shadow-slate-950/50
        "
    >

                            {/* ==========================
                                Project Content
                            ========================== */}

                            <Link
                                to={`/projects/${project._id}`}
                                className="block"
                            >

                                <h2
                                    className="
                    text-xl
                    font-semibold
                    text-slate-900
                    dark:text-white
                "
                                >
                                    {project.name}
                                </h2>


                                <p
                                    className="
                    text-gray-500
                    dark:text-slate-400
                    mt-2
                "
                                >
                                    {project.description}
                                </p>


                                {/* ==========================
                                    Project Information
                                ========================== */}

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-4
                                        mt-5
                                        text-sm
                                    "
                                >

                                    <span
                                        className="
                        px-3
                        py-1
                        rounded-full
                        bg-gray-100
                        dark:bg-slate-800
                        text-slate-700
                        dark:text-slate-300
                    "
                                    >
                                        Members: {project.members}
                                    </span>


                                    <span
                                        className="
                        px-3
                        py-1
                        rounded-full
                        bg-blue-100
                        dark:bg-blue-950
                        text-blue-700
                        dark:text-blue-300
                    "
                                    >
                                        Role: {item.role}
                                    </span>

                                </div>

                            </Link>


                            {/* ==========================
                                Admin Actions
                            ========================== */}

                            {isAdmin && (

                                <div
                                    className="
                                        flex
                                        gap-3
                                        mt-5
                                    "
                                >

                                    <button
                                        onClick={() =>
                                            handleOpenEdit(project)
                                        }
                                        className="
                        px-4
                        py-2
                        rounded-lg
                        bg-blue-600
                        hover:bg-blue-700
                        text-white
                        transition
                    "
                                    >
                                        Edit
                                    </button>


                                    <button
                                        onClick={() =>
                                            handleOpenDelete(project)
                                        }
                                        className="
                        px-4
                        py-2
                        rounded-lg
                        bg-red-600
                        hover:bg-red-700
                        text-white
                        transition
                    "
                                    >
                                        Delete
                                    </button>

                                </div>

                            )}

                        </div>

                    );

                })}

            </div>


            {/* ==================================================
                EDIT PROJECT MODAL
            ================================================== */}

            {showEditModal && (

    <div
        className="
            fixed
            inset-0
            bg-black/50
            flex
            items-center
            justify-center
            z-50
        "
    >

        <div
            className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-2xl
                p-6
                w-full
                max-w-md
            "
        >

            <h2
                className="
                    text-2xl
                    font-bold
                    mb-5
                    text-slate-900
                    dark:text-white
                "
            >
                Edit Project
            </h2>


            <form
                onSubmit={handleEditProject}
                className="space-y-4"
            >

                <div>

                    <label
                        className="
                            block
                            text-sm
                            font-medium
                            mb-1
                            text-slate-700
                            dark:text-slate-300
                        "
                    >
                        Project Name
                    </label>

                    <input
                        type="text"
                        value={editName}
                        onChange={(e) =>
                            setEditName(
                                e.target.value
                            )
                        }
                        className="
                            w-full
                            border
                            border-slate-300
                            dark:border-slate-700
                            bg-white
                            dark:bg-slate-800
                            text-slate-900
                            dark:text-white
                            rounded-lg
                            px-3
                            py-2
                            outline-none
                            focus:ring-2
                            focus:ring-blue-500
                        "
                    />

                </div>


                <div>

                    <label
                        className="
                            block
                            text-sm
                            font-medium
                            mb-1
                            text-slate-700
                            dark:text-slate-300
                        "
                    >
                        Description
                    </label>

                    <textarea
                        value={editDescription}
                        onChange={(e) =>
                            setEditDescription(
                                e.target.value
                            )
                        }
                        rows="4"
                        className="
                            w-full
                            border
                            border-slate-300
                            dark:border-slate-700
                            bg-white
                            dark:bg-slate-800
                            text-slate-900
                            dark:text-white
                            rounded-lg
                            px-3
                            py-2
                            outline-none
                            focus:ring-2
                            focus:ring-blue-500
                            resize-none
                        "
                    />

                </div>


                <div
                    className="
                        flex
                        justify-end
                        gap-3
                        pt-3
                    "
                >

                    <button
                        type="button"
                        onClick={() =>
                            setShowEditModal(false)
                        }
                        className="
                            px-4
                            py-2
                            rounded-lg
                            border
                            border-slate-300
                            dark:border-slate-700
                            text-slate-700
                            dark:text-slate-300
                            hover:bg-slate-100
                            dark:hover:bg-slate-800
                            transition
                        "
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="
                            px-4
                            py-2
                            rounded-lg
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            transition
                            disabled:opacity-50
                        "
                    >
                        {actionLoading
                            ? "Updating..."
                            : "Update"}
                    </button>

                </div>

            </form>

        </div>

    </div>

)}


            {/* ==================================================
                DELETE PROJECT MODAL
            ================================================== */}

            {showDeleteModal && (

    <div
        className="
            fixed
            inset-0
            bg-black/50
            flex
            items-center
            justify-center
            z-50
        "
    >

        <div
            className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-2xl
                p-6
                w-full
                max-w-md
            "
        >

            <h2
                className="
                    text-2xl
                    font-bold
                    mb-3
                    text-slate-900
                    dark:text-white
                "
            >
                Delete Project
            </h2>


            <p
                className="
                    text-gray-600
                    dark:text-slate-400
                    mb-6
                "
            >
                Are you sure you want to delete{" "}

                <span
                    className="
                        font-semibold
                        text-slate-900
                        dark:text-slate-200
                    "
                >
                    {selectedProject?.name}
                </span>

                ?
            </p>


            <div
                className="
                    flex
                    justify-end
                    gap-3
                "
            >

                <button
                    onClick={() =>
                        setShowDeleteModal(false)
                    }
                    className="
                        px-4
                        py-2
                        rounded-lg
                        border
                        border-slate-300
                        dark:border-slate-700
                        text-slate-700
                        dark:text-slate-300
                        hover:bg-slate-100
                        dark:hover:bg-slate-800
                        transition
                    "
                >
                    Cancel
                </button>


                <button
                    onClick={handleDeleteProject}
                    disabled={actionLoading}
                    className="
                        px-4
                        py-2
                        rounded-lg
                        bg-red-600
                        hover:bg-red-700
                        text-white
                        transition
                        disabled:opacity-50
                    "
                >
                    {actionLoading
                        ? "Deleting..."
                        : "Delete"}
                </button>

            </div>

        </div>

    </div>

)}

        </div>

    );

}