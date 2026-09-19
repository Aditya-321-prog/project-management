import DueBadge from "../../components/tasks/DueBadge";
import { PageSkeleton } from "../../components/common/Skeleton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    Calendar,
    Flag,
    Paperclip,
    Download,
    CheckCircle2,
    Circle,
    Plus,
    Trash2,
    Send,
    Link2,
    ExternalLink,
} from "lucide-react";

import { useAuthStore } from "../../store/authStore";
import { getProjectById } from "../../services/projectService";
import { useNotifications } from "../../context/NotificationContext";

import {
    getTaskById,
    submitTask,
    reviewTask,
} from "../../services/taskService";

import {
    getSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
} from "../../services/subtaskService";

import {
    getComments,
    createComment,
    deleteComment,
} from "../../services/commentService";
import socket from "../../socket/socket.js";

export default function TaskDetails() {

    const navigate = useNavigate();

    const { projectId, taskId } = useParams();

    const currentUser = useAuthStore((state) => state.user);

    const { fetchNotifications } = useNotifications();

        // ==========================
    // Main Task
    // ==========================

    const [task, setTask] = useState(null);

    const [comments, setComments] = useState([]);

    const [newComment, setNewComment] = useState("");

    const [loading, setLoading] = useState(true);

    // ==========================
    // Personal Subtasks
    // ==========================

    const [subtasks, setSubtasks] = useState([]);

    const [newSubtask, setNewSubtask] = useState("");

    // ==========================
    // Submission
    // ==========================

    const [submissionFiles, setSubmissionFiles] = useState([]);

    const [submitting, setSubmitting] = useState(false);

    // ==========================
    // Admin Review
    // ==========================

    const [reviewLoading, setReviewLoading] = useState(false);

    const [feedback, setFeedback] = useState("");

    // ==========================
    // Current User
    // ==========================

    // Project ka role (pehle sirf task banane wala hi "admin" maana jaata tha,
    // project ke dusre admins submissions review nahi kar paate the)
    const [projectRole, setProjectRole] = useState("");

    const isAdmin =
        projectRole === "admin" ||
        task?.assignedBy?._id === currentUser?._id;

    const isAssignedMember =
        task?.assignedTo?._id === currentUser?._id;

    // ==========================
    // Submission Helper
    // ==========================

    const mySubmission =
    task?.submissions
        ?.filter(
            (submission) =>
                submission.submittedBy?._id === currentUser?._id
        )
        ?.sort(
            (a, b) =>
                new Date(b.submittedAt) -
                new Date(a.submittedAt)
        )[0];

    // Fetch Task


    const fetchTask = async () => {
        try {

            const res = await getTaskById(projectId, taskId);

            setTask(res.data.data);

        } catch (error) {

            console.log(error);

            navigate(`/projects/${projectId}`);

        }
    };

    useEffect(() => {

    const handleTaskSubmitted = (updatedTask) => {

        console.log("TASK SUBMITTED:", updatedTask);

        if (updatedTask._id !== taskId) {
            return;
        }

        setTask(updatedTask);
    };


    const handleTaskReviewed = (updatedTask) => {

        console.log("TASK REVIEWED:", updatedTask);

        if (updatedTask._id !== taskId) {
            return;
        }

        setTask(updatedTask);
    };

    const handleCommentCreated = (newComment) => {

        console.log(
            " COMMENT CREATED:",
            newComment
        );

        if (
            newComment.task?.toString() !==
            taskId.toString()
        ) {
            return;
        }

        setComments((prev) => [
            ...prev,
            newComment,
        ]);

    };


    const handleCommentDeleted = (data) => {

        console.log(
            " COMMENT DELETED:",
            data
        );

        if (
            data.taskId?.toString() !==
            taskId.toString()
        ) {
            return;
        }

        setComments((prev) =>
            prev.filter(
                (comment) =>
                    comment._id !==
                    data.commentId
            )
        );

    };


    socket.on(
        "comment-created",
        handleCommentCreated
    );

    socket.on(
        "comment-deleted",
        handleCommentDeleted
    );


    socket.on(
        "task-submitted",
        handleTaskSubmitted
    );

    socket.on(
        "task-reviewed",
        handleTaskReviewed
    );


    return () => {

        socket.off(
            "task-submitted",
            handleTaskSubmitted
        );

        socket.off(
            "task-reviewed",
            handleTaskReviewed
        );

        socket.off(
            "comment-created",
            handleCommentCreated
        );

        socket.off(
            "comment-deleted",
            handleCommentDeleted
        );

    };

    }, [taskId]);

// Fetch Personal Subtasks

    const fetchSubtasks = async () => {
            try {

                const res = await getSubtasks(projectId, taskId);

                setSubtasks(res.data.data);

            } catch (error) {

                console.log(error);

            }
        };

    const fetchComments = async () => {

        try {

            const res = await getComments(
                projectId,
                taskId
            );

            setComments(res.data.data);

        }

        catch(error){

            console.log(error);

        }

    };

    // Initial Load

    useEffect(() => {

        const loadData = async () => {

            try {

                setLoading(true);

                await Promise.all([
                    fetchTask(),
                    fetchSubtasks(),
                    fetchComments(),
                    getProjectById(projectId)
                        .then((res) => setProjectRole(res.data.data.currentUserRole))
                        .catch(() => {}),
                ]);

            } finally {

                setLoading(false);

            }

        };

        loadData();

    }, [projectId, taskId]);

if (loading) {
    return <PageSkeleton />;
}

if (!task) {
    return (
        <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-950">
            <p className="text-lg text-slate-900 dark:text-slate-100">
                Task not found
            </p>
        </div>
    );
}


    const handleCreateComment = async () => {

        if(!newComment.trim()) return;

        try{

            await createComment(

                projectId,

                taskId,

                {
                    content:newComment
                }

            );

            setNewComment("");

            fetchComments();

        }

        catch(error){

            console.log(error);

        }

    };


    const handleDeleteComment = async(commentId)=>{

        try{

            await deleteComment(

                projectId,

                taskId,

                commentId

            );

            fetchComments();

        }

        catch(error){

            console.log(error);

        }

    };


    const completedSubtasks = subtasks.filter(
        (subtask) => subtask.isCompleted
    ).length;

    const progress =
        subtasks.length === 0
            ? 0
            : Math.round(
                (completedSubtasks / subtasks.length) * 100
            );


    // ==========================
    // Create Personal Subtask
    // ==========================

    const handleCreateSubtask = async () => {

        if (!newSubtask.trim()) return;

        try {

            await createSubtask(
                projectId,
                taskId,
                {
                    title: newSubtask,
                }
            );

            await fetchNotifications();

            setNewSubtask("");

            await fetchSubtasks();

        } catch (error) {

            console.log(error);

        }

    };



    // Toggle Personal Subtask


    const handleToggleSubtask = async (subtask) => {

        try {

            await updateSubtask(
                projectId,
                taskId,
                subtask._id,
                {
                    isCompleted: !subtask.isCompleted,
                }
            );

            await fetchSubtasks();

        } catch (error) {

            console.log(error);

        }

    };

    // Delete Personal Subtask

    const handleDeleteSubtask = async (subtaskId) => {

        try {

            await deleteSubtask(
                projectId,
                taskId,
                subtaskId
            );

            await fetchNotifications();

            await fetchSubtasks();

        } catch (error) {

            console.log(error);

        }

    };

    // Submit Task


    const handleSubmitTask = async () => {

        if (submissionFiles.length === 0) {

            alert("Please choose at least one file.");

            return;

        }

        try {

            setSubmitting(true);

            const formData = new FormData();

            submissionFiles.forEach((file) => {

                formData.append("files", file);

            });

            await submitTask(
                projectId,
                taskId,
                formData
            );

            setSubmissionFiles([]);

            await fetchTask();

        } catch (error) {

            console.log(error);

        } finally {

            setSubmitting(false);

        }

    };



    const handleReviewSubmission = async (
        submissionId,
        status
    ) => {

        try {

            setReviewLoading(true);

            await reviewTask(
                projectId,
                taskId,
                {
                    submissionId,
                    status,
                    feedback,
                }
            );

            setFeedback("");

            await fetchTask();

        } catch (error) {

            console.log(error);

        } finally {

            setReviewLoading(false);

        }

    };


    return (

<div className="max-w-6xl mx-auto p-6 space-y-6">

    {/* ===========================
            Header
    ============================ */}

    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <div className="flex justify-between items-start">

        <div>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {task.title}
            </h1>

            <p className="text-gray-600 dark:text-slate-400 mt-3">
                {task.description || "No description"}
            </p>

        </div>


        <span
            className={`px-4 py-2 rounded-full text-sm font-semibold

                ${
                    task.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"

                        : task.status === "in_review"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"

                        : task.status === "in_progress"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"

                        : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                }
            `}
        >

            {task.status
                ?.replace("_", " ")
                .toUpperCase()}

        </span>

    </div>


    <div className="grid md:grid-cols-3 gap-5 mt-8">

        <div>

            <p className="text-sm text-gray-500 dark:text-slate-500">
                Assigned To
            </p>

            <p className="font-semibold text-slate-900 dark:text-slate-100">

                {task.assignedTo
                    ? task.assignedTo.username
                    : "Not Assigned"}

            </p>

        </div>


        <div>

            <p className="text-sm text-gray-500 dark:text-slate-500">
                Priority
            </p>

            <p
                className={`font-semibold

                    ${
                        task.priority === "high"
                            ? "text-red-600 dark:text-red-400"

                            : task.priority === "medium"
                            ? "text-yellow-600 dark:text-yellow-400"

                            : "text-green-600 dark:text-green-400"
                    }
                `}
            >

                {task.priority}

            </p>

        </div>


        <div>

            <p className="text-sm text-gray-500 dark:text-slate-500">
                Due Date
            </p>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">

                <Calendar size={16} />

                <span>

                    {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "No Due Date"}

                </span>

                <DueBadge task={task} />

            </div>

        </div>

    </div>

</div>

{isAssignedMember && (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

        <div className="flex justify-between mb-3">

            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Progress
            </h2>

            <span className="font-bold text-blue-600 dark:text-blue-400">
                {progress}%
            </span>

        </div>


        <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">

            <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                style={{
                    width: `${progress}%`,
                }}
            />

        </div>


        <p className="text-sm text-gray-500 dark:text-slate-400 mt-3">

            {completedSubtasks} / {subtasks.length} Personal Tasks Completed

        </p>

    </div>
)}

{/* ===========================
        Task Attachments
=========================== */}

<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <h2 className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-100">
        Attachments
    </h2>


    {task.attachments?.length === 0 ? (

        <p className="text-gray-500 dark:text-slate-400">
            No attachments
        </p>

    ) : (

        <div className="space-y-3">

            {task.attachments?.map((file) => (

                <a
                    key={file._id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="
                        flex
                        justify-between
                        items-center
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-xl
                        p-4
                        hover:bg-gray-50
                        dark:hover:bg-slate-800
                        transition
                    "
                >

                    <div>

                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                            📄 {file.filename}
                        </p>

                        <p className="text-sm text-gray-500 dark:text-slate-400">

                            {(file.size / (1024 * 1024)).toFixed(2)} MB

                        </p>

                    </div>


                    <button
                        className="
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            px-4
                            py-2
                            rounded-lg
                            transition
                        "
                    >
                        Download
                    </button>

                </a>

            ))}

        </div>

    )}

</div>

{/* ===========================
        Task Links
=========================== */}

<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <h2 className="flex items-center gap-2 text-xl font-bold mb-5 text-slate-900 dark:text-slate-100">
        <Link2 size={20} />
        Links
    </h2>

    {!task.links?.length ? (
        <p className="text-gray-500 dark:text-slate-400">
            No links
        </p>
    ) : (
        <div className="space-y-3">
            {task.links.map((link) => (
                <a
                    key={link._id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            🔗 {link.title || link.url}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
                            {link.url}
                        </p>
                    </div>

                    <span className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shrink-0">
                        Open <ExternalLink size={14} />
                    </span>
                </a>
            ))}
        </div>
    )}

</div>

{/* ===========================
        Team
=========================== */}



<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">
        Team
    </h2>


    <div className="grid md:grid-cols-2 gap-6">

        {/* Assigned Member */}

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">

            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Assigned Member
            </p>

            <div className="flex items-center gap-4">

                <img
                    src={
                        task.assignedTo?.avatar?.url ||
                        "https://ui-avatars.com/api/?name=User"
                    }
                    alt=""
                    className="
                        w-14
                        h-14
                        rounded-full
                        object-cover
                        border
                        border-slate-200
                        dark:border-slate-700
                    "
                />

                <div>

                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                        {task.assignedTo?.fullName || "Unassigned"}
                    </h3>

                    <p className="text-gray-500 dark:text-slate-400">
                        @{task.assignedTo?.username || "-"}
                    </p>

                    <span className="
                        inline-block
                        mt-2
                        px-3
                        py-1
                        rounded-full
                        bg-blue-100
                        text-blue-700
                        dark:bg-blue-900/40
                        dark:text-blue-400
                        text-xs
                        font-semibold
                    ">
                        Member
                    </span>

                </div>

            </div>

        </div>


        {/* Assigned By */}

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">

            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Assigned By
            </p>

            <div className="flex items-center gap-4">

                <img
                    src={
                        task.assignedBy?.avatar?.url ||
                        "https://ui-avatars.com/api/?name=Admin"
                    }
                    alt=""
                    className="
                        w-14
                        h-14
                        rounded-full
                        object-cover
                        border
                        border-slate-200
                        dark:border-slate-700
                    "
                />

                <div>

                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                        {task.assignedBy?.fullName}
                    </h3>

                    <p className="text-gray-500 dark:text-slate-400">
                        @{task.assignedBy?.username}
                    </p>

                    <span className="
                        inline-block
                        mt-2
                        px-3
                        py-1
                        rounded-full
                        bg-purple-100
                        text-purple-700
                        dark:bg-purple-900/40
                        dark:text-purple-400
                        text-xs
                        font-semibold
                    ">
                        Admin
                    </span>

                </div>

            </div>

        </div>

    </div>

</div>



{/* ===========================
        Personal Checklist
=========================== */}

{isAssignedMember && (
<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <div className="flex justify-between items-center mb-5">

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Personal Checklist
        </h2>

        {currentUser._id === task.assignedTo?._id && (

            <button
                onClick={handleCreateSubtask}
                className="
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    transition
                "
            >
                Add
            </button>

        )}

    </div>


    {currentUser._id === task.assignedTo?._id && (

        <div className="flex gap-3 mb-6">

            <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="New subtask..."
                className="
                    flex-1
                    border
                    border-slate-300
                    dark:border-slate-700
                    bg-white
                    dark:bg-slate-800
                    text-slate-900
                    dark:text-slate-100
                    placeholder:text-slate-400
                    dark:placeholder:text-slate-500
                    rounded-lg
                    p-3
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
            />

        </div>

    )}


    {subtasks.length === 0 ? (

        <p className="text-gray-500 dark:text-slate-400">
            No subtasks yet
        </p>

    ) : (

        <div className="space-y-3">

            {subtasks.map((subtask) => (

                <div
                    key={subtask._id}
                    className="
                        flex
                        justify-between
                        items-center
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-xl
                        p-4
                        bg-white
                        dark:bg-slate-800
                    "
                >

                    <div className="flex items-center gap-4">

                        <input
                            type="checkbox"
                            checked={subtask.isCompleted}
                            disabled={
                                currentUser._id !==
                                task.assignedTo?._id
                            }
                            onChange={() =>
                                handleToggleSubtask(subtask)
                            }
                            className="accent-blue-600"
                        />

                        <span
                            className={
                                subtask.isCompleted
                                    ? "line-through text-gray-400 dark:text-slate-500"
                                    : "text-slate-900 dark:text-slate-100"
                            }
                        >
                            {subtask.title}
                        </span>

                    </div>


                    {currentUser._id === task.assignedTo?._id && (

                        <button
                            onClick={() =>
                                handleDeleteSubtask(subtask._id)
                            }
                            className="
                                text-red-600
                                dark:text-red-400
                                hover:text-red-700
                                dark:hover:text-red-300
                                font-semibold
                                transition
                            "
                        >
                            Delete
                        </button>

                    )}

                </div>

            ))}

        </div>

    )}

</div>
)}


{/* ===========================
        Submit Work
=========================== */}

{currentUser._id === task.assignedTo?._id && (

<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <h2 className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-100">
        Submit Work
    </h2>


    {mySubmission && (

        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5">

            <div>

                {/* Pending */}

                {mySubmission.status === "pending" && (

                    <div className="rounded-xl border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-5">

                        <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                            ⏳ Your submission is under review.
                        </p>

                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                            Please wait for the admin to review your work.
                        </p>

                    </div>

                )}


                {/* Approved */}

                {mySubmission.status === "approved" && (

                    <div className="rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">

                        <p className="font-semibold text-green-700 dark:text-green-400">
                            ✅ Task Approved
                        </p>

                        {mySubmission.feedback && (

                            <p className="mt-3 text-gray-700 dark:text-slate-300">
                                Feedback : {mySubmission.feedback}
                            </p>

                        )}

                    </div>

                )}


                {/* Rejected */}

                {mySubmission.status === "rejected" && (

                    <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">

                        <p className="font-semibold text-red-700 dark:text-red-400">
                            ❌ Submission Rejected
                        </p>

                        {mySubmission.feedback && (

                            <p className="mt-3 text-gray-700 dark:text-slate-300">
                                Feedback : {mySubmission.feedback}
                            </p>

                        )}

                        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
                            Please fix the issues and submit again below.
                        </p>

                    </div>

                )}

            </div>

        </div>

    )}


    {(!mySubmission || mySubmission.status === "rejected") && (

        <>

            {/* Upload Form */}

            <label
                htmlFor="submissionFiles"
                className="
                    flex
                    flex-col
                    items-center
                    justify-center
                    border-2
                    border-dashed
                    border-slate-300
                    dark:border-slate-600
                    rounded-xl
                    p-8
                    cursor-pointer
                    hover:bg-gray-50
                    dark:hover:bg-slate-800
                    transition
                "
            >

                <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Click to upload files
                </p>

                <p className="text-gray-500 dark:text-slate-400 text-sm">
                    PDF, ZIP, Images, Docs...
                </p>

            </label>


            <input
                id="submissionFiles"
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                    setSubmissionFiles(
                        Array.from(e.target.files)
                    )
                }
            />


            {submissionFiles.length > 0 && (

                <div className="space-y-3 mt-5">

                    {submissionFiles.map((file, index) => (

                        <div
                            key={index}
                            className="
                                border
                                border-slate-200
                                dark:border-slate-700
                                rounded-lg
                                p-3
                                flex
                                justify-between
                                bg-white
                                dark:bg-slate-800
                            "
                        >

                            <span className="text-slate-800 dark:text-slate-200">
                                📄 {file.name}
                            </span>

                            <span className="text-gray-500 dark:text-slate-400 text-sm">

                                {(file.size / 1024).toFixed(1)} KB

                            </span>

                        </div>

                    ))}

                </div>

            )}


            <button
                onClick={handleSubmitTask}
                disabled={submitting}
                className="
                    mt-6
                    bg-blue-600
                    hover:bg-blue-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    px-5
                    py-3
                    rounded-xl
                    transition
                "
            >
                {submitting
                    ? "Submitting..."
                    : mySubmission?.status === "rejected"
                    ? "Resubmit Task"
                    : "Submit Task"}
            </button>

        </>

    )}

</div>

)}

{/* ===========================
        Admin Review Panel
=========================== */}

{isAdmin && task.submissions?.length > 0 && (

    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

        <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">
            Submitted Work
        </h2>

        <div className="space-y-6">

            {task.submissions.map((submission) => (

                <div
                    key={submission._id}
                    className="
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-xl
                        p-5
                        bg-white
                        dark:bg-slate-800
                    "
                >

                    {/* Submission Header */}

                    <div className="flex justify-between">

                        <div>

                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                {submission.submittedBy?.username}
                            </h3>

                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {new Date(
                                    submission.submittedAt
                                ).toLocaleString()}
                            </p>

                        </div>


                        {/* Submission Status */}

                        <span
                            className={`
                                px-3
                                py-1
                                rounded-full
                                text-sm
                                font-semibold

                                ${
                                    submission.status === "approved"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"

                                        : submission.status === "rejected"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"

                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                }
                            `}
                        >
                            {submission.status}
                        </span>

                    </div>


                    {/* Submitted Files */}

                    <div className="mt-5 space-y-3">

                        {submission.files.map((file, index) => (

                            <a
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="
                                    flex
                                    justify-between
                                    items-center
                                    border
                                    border-slate-200
                                    dark:border-slate-700
                                    rounded-lg
                                    p-3
                                    bg-white
                                    dark:bg-slate-900
                                    hover:bg-slate-50
                                    dark:hover:bg-slate-700
                                    transition
                                "
                            >

                                <div>

                                    <p className="text-slate-800 dark:text-slate-200">
                                        📄 {file.filename}
                                    </p>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>

                                </div>

                                <Download
                                    size={18}
                                    className="text-slate-600 dark:text-slate-300"
                                />

                            </a>

                        ))}

                    </div>


                    {/* Review Section */}

                    {submission.status === "pending" && (

                        <>

                            <textarea
                                rows={3}
                                placeholder="Write feedback..."
                                value={feedback}
                                onChange={(e) =>
                                    setFeedback(e.target.value)
                                }
                                className="
                                    mt-5
                                    w-full
                                    border
                                    border-slate-300
                                    dark:border-slate-700
                                    rounded-xl
                                    p-3
                                    bg-white
                                    dark:bg-slate-900
                                    text-slate-900
                                    dark:text-slate-100
                                    placeholder:text-slate-400
                                    dark:placeholder:text-slate-500
                                    outline-none
                                    focus:ring-2
                                    focus:ring-blue-500
                                "
                            />


                            <div className="flex gap-4 mt-5">

                                <button
                                    onClick={() =>
                                        handleReviewSubmission(
                                            submission._id,
                                            "approved"
                                        )
                                    }
                                    disabled={reviewLoading}
                                    className="
                                        disabled:opacity-60
                                        disabled:cursor-not-allowed
                                        active:scale-95
                                        bg-green-600
                                        hover:bg-green-700
                                        text-white
                                        px-5
                                        py-2
                                        rounded-lg
                                        transition
                                    "
                                >
                                    Approve
                                </button>


                                <button
                                    onClick={() =>
                                        handleReviewSubmission(
                                            submission._id,
                                            "rejected"
                                        )
                                    }
                                    disabled={reviewLoading}
                                    className="
                                        disabled:opacity-60
                                        disabled:cursor-not-allowed
                                        active:scale-95
                                        bg-red-600
                                        hover:bg-red-700
                                        text-white
                                        px-5
                                        py-2
                                        rounded-lg
                                        transition
                                    "
                                >
                                    Reject
                                </button>

                            </div>

                        </>

                    )}

                </div>

            ))}

        </div>

    </div>

)}

<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            💬 Discussion
        </h2>

        <span className="text-sm text-slate-500 dark:text-slate-400">
            {comments.length} Comments
        </span>

    </div>


    {/* Comment Input */}

    <div className="flex gap-3 mb-8">

        <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="
                flex-1
                border
                border-slate-300
                dark:border-slate-700
                bg-white
                dark:bg-slate-800
                text-slate-900
                dark:text-slate-100
                placeholder:text-slate-400
                dark:placeholder:text-slate-500
                rounded-xl
                p-4
                resize-none
                focus:ring-2
                focus:ring-blue-500
                outline-none
            "
        />

        <button
            onClick={handleCreateComment}
            className="
                self-end
                bg-blue-600
                hover:bg-blue-700
                text-white
                px-6
                py-3
                rounded-xl
                transition
            "
        >
            Send
        </button>

    </div>


    {/* Comments */}

    {comments.length === 0 ? (

        <div className="text-center py-10">

            <p className="text-slate-500 dark:text-slate-400">
                No comments yet.
            </p>

        </div>

    ) : (

        <div className="space-y-5">

            {comments.map((comment) => (

                <div
                    key={comment._id}
                    className="
                        border
                        border-slate-200
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        rounded-xl
                        p-5
                    "
                >

                    <div className="flex justify-between">

                        <div>

                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                {comment.user?.fullName ||
                                    comment.user?.username}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(
                                    comment.createdAt
                                ).toLocaleString()}
                            </p>

                        </div>


                        {(currentUser._id === comment.user?._id || isAdmin) && (

                            <button
                                onClick={() =>
                                    handleDeleteComment(comment._id)
                                }
                                className="
                                    text-red-600
                                    dark:text-red-400
                                    hover:text-red-700
                                    dark:hover:text-red-300
                                    font-medium
                                    transition
                                "
                            >
                                Delete
                            </button>

                        )}

                    </div>


                    <p className="
                        mt-4
                        whitespace-pre-wrap
                        text-slate-700
                        dark:text-slate-300
                    ">
                        {comment.content}
                    </p>

                </div>

            ))}

        </div>

    )}

</div>



{/* ===========================
        Review History
=========================== */}

{task.submissions?.some(
    (submission) => submission.status !== "pending"
) && (

<div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-6">

    <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">
        Review History
    </h2>

    <div className="space-y-5">

        {task.submissions
            .filter(
                (submission) =>
                    submission.status !== "pending"
            )
            .sort(
                (a, b) =>
                    new Date(b.reviewedAt) -
                    new Date(a.reviewedAt)
            )
            .map((submission) => (

                <div
                    key={submission._id}
                    className="
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-xl
                        p-5
                        bg-white
                        dark:bg-slate-800
                    "
                >

                    <div className="flex justify-between items-start">

                        <div className="flex gap-4">

                            <img
                                src={
                                    submission.reviewedBy?.avatar?.url ||
                                    "https://ui-avatars.com/api/?name=Admin"
                                }
                                alt=""
                                className="
                                    w-12
                                    h-12
                                    rounded-full
                                    object-cover
                                    border
                                    border-slate-200
                                    dark:border-slate-600
                                "
                            />

                            <div>

                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">

                                    {submission.reviewedBy?.fullName}

                                </h3>

                                <p className="text-slate-500 dark:text-slate-400 text-sm">

                                    @{submission.reviewedBy?.username}

                                </p>

                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">

                                    {
                                        submission.reviewedAt &&
                                        new Date(
                                            submission.reviewedAt
                                        ).toLocaleString()
                                    }

                                </p>

                            </div>

                        </div>


                        <span
                            className={`
                                px-3
                                py-1
                                rounded-full
                                text-sm
                                font-semibold

                                ${
                                    submission.status === "approved"

                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"

                                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                }
                            `}
                        >

                            {submission.status.toUpperCase()}

                        </span>

                    </div>


                    {submission.feedback && (

                        <div
                            className="
                                mt-5
                                rounded-xl
                                bg-slate-50
                                dark:bg-slate-900
                                border
                                border-slate-200
                                dark:border-slate-700
                                p-4
                            "
                        >

                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">

                                Feedback

                            </p>

                            <p className="text-slate-800 dark:text-slate-200">

                                {submission.feedback}

                            </p>

                        </div>

                    )}

                </div>

            ))}

    </div>

</div>

)}

</div>



    )
}