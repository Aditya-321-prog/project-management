import {
	useEffect,
	useState
} from "react";
import {
	useParams
} from "react-router-dom";
import {
	getProjectById,
	getProjectMembers,
	updateMemberRole,
	removeProjectMember,
} from "../../services/projectService";
import {
	useAuthStore
} from "../../store/authStore";
import {
	addProjectMember,
    updateProject,
    deleteProject,
} from "../../services/projectService";
import {
	getTasks,
	createTask,
	deleteTask,
	updateTask,
	updateTaskStatus
} from "../../services/taskService";
import {
	getNotes,
	createNote,
	updateNote,
	deleteNote
} from "../../services/noteService";
import {
	Link
} from "react-router-dom";
import {
	Calendar,
	Flag,
	SquarePen,
	Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { getProjectActivities } from "../../services/activityService";
import { Paperclip, Download, Link2, ExternalLink, X } from "lucide-react";
import socket from "../../socket/socket";
import { toast } from "react-hot-toast";
import { PageSkeleton } from "../../components/common/Skeleton";
import TaskToolbar from "../../components/tasks/TaskToolbar";
import KanbanBoard from "../../components/tasks/KanbanBoard";
import ProjectChat from "../../components/chat/ProjectChat";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import DueBadge from "../../components/tasks/DueBadge";
import {
    DEFAULT_TASK_FILTERS,
    applyTaskFilters,
    hasActiveFilters,
    isOverdue,
    loadSavedSort,
} from "../../lib/taskUtils";

export default function ProjectDetails() {
	
  const navigate = useNavigate();

  
  
  const {
		projectId
	} = useParams();

	const currentUser = useAuthStore((state) => state.user);

	const [project, setProject] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState("");
	const [loading, setLoading] = useState(true);
	const [members, setMembers] = useState([]);
	const [showAddMember, setShowAddMember] = useState(false);

	const [memberData, setMemberData] = useState({
		email: "",
		role: "member",
	});

    const [showEditProject, setShowEditProject] = useState(false);

    const [editProjectData, setEditProjectData] = useState({
        name: "",
        description: "",
    });

	const [tasks, setTasks] = useState([]);

    // Search / sort / filter (sort ki choice refresh ke baad bhi yaad rehti hai)
    // List ya Kanban board (choice yaad rehti hai)
    const [taskView, setTaskView] = useState(() => {
        try {
            return localStorage.getItem("task-view") === "board" ? "board" : "list";
        } catch {
            return "list";
        }
    });

    const changeTaskView = (view) => {
        setTaskView(view);
        try {
            localStorage.setItem("task-view", view);
        } catch {
            // ignore
        }
    };

    const [taskFilters, setTaskFilters] = useState(() => ({
        ...DEFAULT_TASK_FILTERS,
        sortBy: loadSavedSort(),
    }));
	const [showAddTask, setShowAddTask] = useState(false);

    const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    });

    const [taskFiles, setTaskFiles] = useState([]);

    const [taskLinks, setTaskLinks] = useState([]);
    const [linkInput, setLinkInput] = useState({ title: "", url: "" });

    const handleAddLink = () => {
        const url = linkInput.url.trim();
        if (!url) return;

        setTaskLinks((prev) => [
            ...prev,
            { title: linkInput.title.trim(), url },
        ]);
        setLinkInput({ title: "", url: "" });
    };

    const handleRemoveLink = (index) => {
        setTaskLinks((prev) => prev.filter((_, i) => i !== index));
    };

	const [showEditTask, setShowEditTask] = useState(false);

	const [editTaskData, setEditTaskData] = useState({
        title: "",
        description: "",
        assignedTo: "",
        status: "todo",
        priority: "medium",
        dueDate: "",
    });
	const [selectedTask, setSelectedTask] = useState(null);

    // ----- Edit task: attachments + links -----
    const [editExistingFiles, setEditExistingFiles] = useState([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
    const [editNewFiles, setEditNewFiles] = useState([]);
    const [editLinks, setEditLinks] = useState([]);
    const [editLinkInput, setEditLinkInput] = useState({ title: "", url: "" });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");

    const openEditTask = (task) => {
        setEditTaskData({
            title: task.title,
            description: task.description || "",
            assignedTo: task.assignedTo?._id || "",
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        });
        setEditExistingFiles(task.attachments || []);
        setRemovedAttachmentIds([]);
        setEditNewFiles([]);
        setEditLinks(
            (task.links || []).map((l) => ({ _id: l._id, title: l.title, url: l.url }))
        );
        setEditLinkInput({ title: "", url: "" });
        setEditError("");
        setSelectedTask(task);
        setShowEditTask(true);
    };

    const closeEditTask = () => {
        setShowEditTask(false);
        setSelectedTask(null);
        setEditTaskData({
            title: "",
            description: "",
            assignedTo: "",
            status: "todo",
            priority: "medium",
            dueDate: "",
        });
        setEditExistingFiles([]);
        setRemovedAttachmentIds([]);
        setEditNewFiles([]);
        setEditLinks([]);
        setEditLinkInput({ title: "", url: "" });
        setEditError("");
    };

    const toggleRemoveAttachment = (id) => {
        setRemovedAttachmentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleAddEditLink = () => {
        const url = editLinkInput.url.trim();
        if (!url) return;
        setEditLinks((prev) => [...prev, { title: editLinkInput.title.trim(), url }]);
        setEditLinkInput({ title: "", url: "" });
    };

    const handleRemoveEditLink = (index) => {
        setEditLinks((prev) => prev.filter((_, i) => i !== index));
    };

	const [notes, setNotes] = useState([]);

	const [showAddNote, setShowAddNote] = useState(false);

	const [noteData, setNoteData] = useState({
		title: "",
		content: "",
	});
	const [showEditNote, setShowEditNote] = useState(false);

	const [selectedNote, setSelectedNote] = useState(null);

	const [editNoteData, setEditNoteData] = useState({
		title: "",
		content: "",
	});


    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);


const fetchProject = async () => {
    try {
      // 5 requests ek saath (pehle ek ke baad ek chalti thi -> page slow khulta tha)
      const [projectRes, membersRes, tasksRes, notesRes, activityRes] =
        await Promise.all([
          getProjectById(projectId),
          getProjectMembers(projectId),
          getTasks(projectId),
          getNotes(projectId),
          getProjectActivities(projectId),
        ]);

      setActivities(activityRes.data.data);
      setProject(projectRes.data.data.project);
      setCurrentUserRole(projectRes.data.data.currentUserRole);
      setMembers(membersRes.data.data);
      setTasks(tasksRes.data.data);
      setNotes(notesRes.data.data);
    } catch (error) {
      if (
        error.response?.status === 403 ||
        error.response?.status === 404
      ) {
        navigate("/projects");
        return;
      }
      console.log(error);
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  };

useEffect(() => {

    if (!projectId) {
        return;
    }

    fetchProject();

    

    socket.emit("join-project", projectId);

    const handleTaskCreated = (newTask) => {

    
        if (newTask.project?.toString() !== projectId) {
            return;
        }

        // Duplicate na bane (API response + socket dono se aa sakta hai)
        setTasks((prev) => [
            newTask,
            ...prev.filter((task) => task._id !== newTask._id),
        ]);

    };


    const handleTaskUpdated = (updatedTask) => {

        if (updatedTask.project?.toString() !== projectId) {
            return;
        }

        setTasks((prev) =>
            prev.map((task) =>
                task._id === updatedTask._id
                    ? updatedTask
                    : task
            )
        );

    };

    const handleTaskDeleted = (data) => {

    if (data.projectId?.toString() !== projectId) {
        return;
    }

    setTasks((prev) =>
        prev.filter(
            (task) => task._id !== data.taskId
        )
    );

};



    // Project delete ho gaya ya mujhe project se nikal diya gaya
    const handleProjectDeleted = (data) => {
        if (data.projectId?.toString() === projectId) {
            navigate("/projects", { replace: true });
        }
    };

    const handleProjectUpdated = (updated) => {
        if (updated?._id === projectId) {
            setProject(updated);
        }
    };

    socket.on("task-created", handleTaskCreated);
    socket.on("project-deleted", handleProjectDeleted);
    socket.on("project-updated", handleProjectUpdated);

    socket.on("task-updated", handleTaskUpdated);

    socket.on("task-deleted", handleTaskDeleted);

    


    return () => {

        socket.off(
            "task-created",
            handleTaskCreated
        );

        socket.off(
            "task-updated",
            handleTaskUpdated
        );

        socket.off("task-deleted", handleTaskDeleted);
        socket.off("project-deleted", handleProjectDeleted);
        socket.off("project-updated", handleProjectUpdated);

        socket.emit("leave-project", projectId);

        

    };

}, [projectId]);


useEffect(() => {

    const handleMemberAdded = (newMember) => {

        // Duplicate na ho (add karne wale ke paas API refresh bhi hota hai)
        setMembers((prev) => [
            ...prev.filter((m) => m.user?._id !== newMember.user?._id),
            newMember,
        ]);

    };

    const handleMemberRoleUpdated = (data) => {

    setMembers((prev) =>
        prev.map((member) =>
            member.user._id === data.userId
                ? {
                    ...member,
                    role: data.role,
                }
                : member
        )
    );

    // Agar current logged-in user ka role change hua hai
    if (data.userId === currentUser?._id) {

        setCurrentUserRole(data.role);

    }

};

    const handleMemberRemoved = (data) => {

    setMembers((prev) =>
        prev.filter(
            (member) =>
                member.user._id !== data.userId
        )
    );

};

    socket.on(
        "member-added",
        handleMemberAdded
    );

    socket.on(
        "member-role-updated",
        handleMemberRoleUpdated
    );

    socket.on(
    "member-removed",
    handleMemberRemoved
);

    return () => {

        socket.off(
            "member-added",
            handleMemberAdded
        );

        socket.off(
            "member-role-updated",
            handleMemberRoleUpdated
        );

        socket.off(
    "member-removed",
    handleMemberRemoved
);

    };

}, []);


if (loading) {
		return <PageSkeleton />;
}

if (!project) {
		return <div className="text-center mt-20">Project not found</div>;
}

const isAdmin = currentUserRole === "admin";
const myTasks = tasks.filter(
    (task) => task.assignedTo?._id === currentUser?._id
);

const otherTasks = tasks.filter(
    (task) => task.assignedTo?._id !== currentUser?._id
);
const tasksToRender = isAdmin ? tasks : myTasks;

// Search + filters + sort lagne ke baad jo dikhana hai
const visibleTasks = applyTaskFilters(tasksToRender, taskFilters);
const visibleOtherTasks = applyTaskFilters(otherTasks, taskFilters);
const totalTaskCount = tasksToRender.length + (isAdmin ? 0 : otherTasks.length);
const visibleTaskCount = visibleTasks.length + (isAdmin ? 0 : visibleOtherTasks.length);
const filtersActive = hasActiveFilters(taskFilters);

// Board par sab tasks dikhte hain (status column se decide hota hai,
// isliye status filter board par nahi lagta)
const boardTasks = applyTaskFilters(tasks, { ...taskFilters, status: "all" });

// Kanban move: pehle UI turant update (optimistic), fail ho to wapas
const handleMoveTask = async (task, newStatus) => {
    if (task.status === newStatus) return;

    const previous = task.status;
    setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t))
    );

    try {
        const res = await updateTaskStatus(projectId, task._id, newStatus);
        const updated = res.data.data;
        setTasks((prev) =>
            prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t))
        );
    } catch {
        // Error toast api.js khud dikha deta hai
        setTasks((prev) =>
            prev.map((t) => (t._id === task._id ? { ...t, status: previous } : t))
        );
    }
};
const overdueCount = tasks.filter(isOverdue).length;

	const handleAddMember = async () => {
		try {

			await addProjectMember(projectId, memberData);

			// Modal ab sirf success par band hota hai (pehle galat email
			// par bhi band ho jaata tha aur user ko kuch pata nahi chalta tha)
			setShowAddMember(false);
			toast.success("Member added");

			// await fetchNotifications();
			

			setMemberData({
				email: "",
				role: "member",
			});

			// refresh members
			const membersRes = await getProjectMembers(projectId);
			setMembers(membersRes.data.data);
		} catch (error) {
			console.log(error);
		}
	};

	const handleRoleChange = async (userId, newRole) => {
		try {
			await updateMemberRole(projectId, userId, {
				newRole,
			});


			const membersRes = await getProjectMembers(projectId);

			setMembers(membersRes.data.data);
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

	const handleRemoveMember = async (userId) => {
		if (!window.confirm("Remove this member from the project?")) return;
		try {
			await removeProjectMember(projectId, userId);

			// await fetchNotifications();

			const membersRes = await getProjectMembers(projectId);

			setMembers(membersRes.data.data);
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

    const handleEditProject = () => {
    setEditProjectData({
        name: project.name,
        description: project.description,
    });

    setShowEditProject(true);
};

const handleUpdateProject = async () => {
    try {
        const res = await updateProject(
            projectId,
            editProjectData
        );

        setProject(res.data.data);

        setShowEditProject(false);

    } catch (error) {
        console.log(error.response?.data || error);
    }
};

const handleDeleteProject = async () => {
    const confirmed = window.confirm(
        "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
        await deleteProject(projectId);

        navigate("/projects");

    } catch (error) {
        console.log(error.response?.data || error);
    }
};

	const handleCreateTask = async () => {
    try {

        const formData = new FormData();

        formData.append("title", taskData.title);
        formData.append("description", taskData.description);
        formData.append("assignedTo", taskData.assignedTo);

        formData.append("priority", taskData.priority);
        formData.append("dueDate", taskData.dueDate);

        taskFiles.forEach((file) => {
            formData.append("attachments", file);
        });

        // Box me type kiya link "Add" dabaye bina bhi chala jaye
        const allLinks = [...taskLinks];
        if (linkInput.url.trim()) {
            allLinks.push({
                title: linkInput.title.trim(),
                url: linkInput.url.trim(),
            });
        }
        formData.append("links", JSON.stringify(allLinks));

        console.log("TASK DATA:", taskData);
        console.log("ASSIGNED TO:", taskData.assignedTo);

        console.log("Creating task:", taskData);
        console.log("Assigned user ID:", taskData.assignedTo);

        await createTask(projectId, formData);

        // await fetchNotifications();

        setShowAddTask(false);

        setTaskData({
            title: "",
            description: "",
            assignedTo: "",
            status: "todo",
            priority: "medium",
            dueDate: "",
        });

        setTaskFiles([]);
        setTaskLinks([]);
        setLinkInput({ title: "", url: "" });

        const tasksRes = await getTasks(projectId);

        setTasks(tasksRes.data.data);

    } catch (error) {

        console.log(error.response?.data || error);

    }
};

	const handleDeleteTask = async (taskId) => {
		try {
			await deleteTask(projectId, taskId);

			const tasksRes = await getTasks(projectId);

			setTasks(tasksRes.data.data);
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

	const handleEditTask = async () => {
		if (!editTaskData.title.trim()) {
			setEditError("Title is required");
			return;
		}

		try {
			setEditSaving(true);
			setEditError("");

			const formData = new FormData();
			formData.append("title", editTaskData.title);
			formData.append("description", editTaskData.description || "");
			formData.append("assignedTo", editTaskData.assignedTo || "");
			formData.append("status", editTaskData.status);
			formData.append("priority", editTaskData.priority);
			formData.append("dueDate", editTaskData.dueDate || "");

			// Box me likha link "Add" dabaye bina bhi save ho jaye
			const allLinks = [...editLinks];
			if (editLinkInput.url.trim()) {
				allLinks.push({
					title: editLinkInput.title.trim(),
					url: editLinkInput.url.trim(),
				});
			}
			formData.append("links", JSON.stringify(allLinks));
			formData.append("removedAttachments", JSON.stringify(removedAttachmentIds));

			editNewFiles.forEach((file) => {
				formData.append("attachments", file);
			});

			await updateTask(projectId, selectedTask._id, formData);

			const res = await getTasks(projectId);
			setTasks(res.data.data);

			closeEditTask();
		} catch (error) {
			console.log(error.response?.data || error);
			setEditError(error.response?.data?.message || "Task update failed");
		} finally {
			setEditSaving(false);
		}
	};

	const handleCreateNote = async () => {
		try {
			await createNote(projectId, noteData);

			const res = await getNotes(projectId);

			setNotes(res.data.data);

			setNoteData({
				title: "",
				content: "",
			});

			setShowAddNote(false);
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

	const handleDeleteNote = async (noteId) => {
		try {
			await deleteNote(projectId, noteId);


			const res = await getNotes(projectId);

			setNotes(res.data.data);
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

	const handleUpdateNote = async () => {
		try {
			await updateNote(projectId, selectedNote._id, editNoteData);


			const res = await getNotes(projectId);

			setNotes(res.data.data);

			setShowEditNote(false);

			setSelectedNote(null);

      setEditNoteData({
    title: "",
    content: "",
});
		} catch (error) {
			console.log(error.response?.data || error);
		}
	};

return (
    <div className="space-y-6">

        {/* ==========================
            Project Header
        ========================== */}

        <div
            className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-2xl
                p-6
            "
        >

            <div className="flex justify-between items-start">

                <div>

                    <h1
                        className="
                            text-3xl
                            font-bold
                            text-slate-900
                            dark:text-white
                        "
                    >
                        {project.name}
                    </h1>


                    <p
                        className="
                            text-gray-500
                            dark:text-slate-400
                            mt-3
                        "
                    >
                        {project.description}
                    </p>

                </div>


                {isAdmin && (

                    <div className="flex gap-3">

                        <button
                            onClick={handleEditProject}
                            className="
                                px-4
                                py-2
                                rounded-xl
                                bg-blue-600
                                text-white
                                hover:bg-blue-700
                                transition
                            "
                        >
                            Edit
                        </button>


                        <button
                            onClick={handleDeleteProject}
                            className="
                                px-4
                                py-2
                                rounded-xl
                                bg-red-600
                                text-white
                                hover:bg-red-700
                                transition
                            "
                        >
                            Delete
                        </button>

                    </div>

                )}

            </div>

        </div>


        {/* ==========================
            Members
        ========================== */}

        <div className="grid md:grid-cols-3 gap-6">

            <div
                className="
                    bg-white
                    dark:bg-slate-900
                    border
                    border-slate-200
                    dark:border-slate-800
                    rounded-2xl
                    p-5
                "
            >

                <div className="flex justify-between items-center">

                    <h2
                        className="
                            font-semibold
                            text-slate-900
                            dark:text-white
                        "
                    >
                        Members
                    </h2>


                    {isAdmin && (

                        <button
                            onClick={() => setShowAddMember(true)}
                            className="
                                text-sm
                                bg-green-600
                                hover:bg-green-700
                                text-white
                                px-3
                                py-2
                                rounded-lg
                                transition
                            "
                        >
                            Add Member
                        </button>

                    )}

                </div>


                <div className="space-y-3 mt-4">

                    {members.map((member) => (

                        <div
                            key={member.user._id}
                            className="
                                border
                                border-slate-200
                                dark:border-slate-700
                                rounded-xl
                                p-4
                                flex
                                flex-col
                                gap-4
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
                                bg-white
                                dark:bg-slate-800
                            "
                        >

                            {/* Member Info */}

                            <div className="min-w-0">

                                <p
                                    className="
                                        font-medium
                                        truncate
                                        text-slate-900
                                        dark:text-white
                                    "
                                >
                                    {member.user.username}
                                </p>


                                <p
                                    className="
                                        text-sm
                                        text-gray-500
                                        dark:text-slate-400
                                        truncate
                                    "
                                >
                                    {member.user.email}
                                </p>

                            </div>


                            {/* Actions */}

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-2
                                    flex-wrap
                                "
                            >

                                {isAdmin ? (

                                    <select
                                        value={member.role}
                                        onChange={(e) =>
                                            handleRoleChange(
                                                member.user._id,
                                                e.target.value
                                            )
                                        }
                                        className="
                                            border
                                            border-slate-300
                                            dark:border-slate-600
                                            rounded-lg
                                            px-3
                                            py-2
                                            text-sm
                                            bg-white
                                            dark:bg-slate-900
                                            text-slate-900
                                            dark:text-white
                                            outline-none
                                            focus:ring-2
                                            focus:ring-blue-500
                                        "
                                    >

                                        <option value="admin">
                                            Admin
                                        </option>

                                        <option value="member">
                                            Member
                                        </option>

                                        <option value="viewer">
                                            Viewer
                                        </option>

                                    </select>

                                ) : (

                                    <span
                                        className="
                                            px-3
                                            py-1
                                            rounded-full
                                            text-sm
                                            bg-blue-100
                                            dark:bg-blue-950
                                            text-blue-700
                                            dark:text-blue-300
                                        "
                                    >
                                        {member.role}
                                    </span>

                                )}


                                {isAdmin &&
                                    member.user._id !== currentUser?._id && (

                                    <button
                                        onClick={() =>
                                            handleRemoveMember(
                                                member.user._id
                                            )
                                        }
                                        className="
                                            text-sm
                                            bg-red-600
                                            hover:bg-red-700
                                            text-white
                                            px-3
                                            py-2
                                            rounded-lg
                                            transition
                                            whitespace-nowrap
                                        "
                                    >
                                        Remove
                                    </button>

                                )}

                            </div>

                        </div>

                    ))}

        {showEditProject && (
    <div
        className="
            fixed
            inset-0
            bg-black/40
            dark:bg-black/60
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
                rounded-2xl
                p-6
                w-100
                space-y-4
                border
                border-transparent
                dark:border-slate-700
            "
        >
            <h2
                className="
                    text-xl
                    font-bold
                    text-slate-900
                    dark:text-white
                "
            >
                Edit Project
            </h2>

            <input
                type="text"
                placeholder="Project name"
                value={editProjectData.name}
                onChange={(e) =>
                    setEditProjectData({
                        ...editProjectData,
                        name: e.target.value,
                    })
                }
                className="
                    border
                    border-slate-200
                    dark:border-slate-700
                    bg-white
                    dark:bg-slate-800
                    text-slate-900
                    dark:text-white
                    placeholder-slate-400
                    dark:placeholder-slate-500
                    w-full
                    p-3
                    rounded-lg
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
            />

            <textarea
                placeholder="Project description"
                value={editProjectData.description}
                onChange={(e) =>
                    setEditProjectData({
                        ...editProjectData,
                        description: e.target.value,
                    })
                }
                className="
                    border
                    border-slate-200
                    dark:border-slate-700
                    bg-white
                    dark:bg-slate-800
                    text-slate-900
                    dark:text-white
                    placeholder-slate-400
                    dark:placeholder-slate-500
                    w-full
                    p-3
                    rounded-lg
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
            />

            <div className="flex gap-3 justify-end">

                <button
                    onClick={() =>
                        setShowEditProject(false)
                    }
                    className="
                        bg-gray-300
                        dark:bg-slate-700
                        text-slate-800
                        dark:text-slate-200
                        px-4
                        py-2
                        rounded-lg
                        hover:bg-gray-400
                        dark:hover:bg-slate-600
                        transition
                    "
                >
                    Cancel
                </button>

                <button
                    onClick={handleUpdateProject}
                    className="
                        bg-blue-600
                        text-white
                        px-4
                        py-2
                        rounded-lg
                        hover:bg-blue-700
                        transition
                    "
                >
                    Save
                </button>

            </div>
        </div>
    </div>
)}

                        {showAddMember && (
    <div
        className="
            fixed
            inset-0
            bg-black/40
            dark:bg-black/60
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
                border-transparent
                dark:border-slate-700
                p-6
                rounded-2xl
                w-96
            "
        >
            <h2
                className="
                    text-xl
                    font-bold
                    mb-4
                    text-slate-900
                    dark:text-white
                "
            >
                Add Member
            </h2>

            <input
                type="email"
                placeholder="User email"
                className="
                    border
                    border-slate-200
                    dark:border-slate-700
                    bg-white
                    dark:bg-slate-800
                    text-slate-900
                    dark:text-white
                    placeholder-slate-400
                    dark:placeholder-slate-500
                    w-full
                    p-3
                    rounded-lg
                    mb-3
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
                value={memberData.email}
                onChange={(e) =>
                    setMemberData({
                        ...memberData,
                        email: e.target.value,
                    })
                }
            />

            <select
                className="
                    border
                    border-slate-200
                    dark:border-slate-700
                    bg-white
                    dark:bg-slate-800
                    text-slate-900
                    dark:text-white
                    w-full
                    p-3
                    rounded-lg
                    mb-4
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
                value={memberData.role}
                onChange={(e) =>
                    setMemberData({
                        ...memberData,
                        role: e.target.value,
                    })
                }
            >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
            </select>

            <div className="flex gap-3">

                <button
                    onClick={handleAddMember}
                    className="
                        bg-blue-600
                        text-white
                        px-4
                        py-2
                        rounded-lg
                        hover:bg-blue-700
                        transition
                    "
                >
                    Add
                </button>

                <button
                    onClick={() => setShowAddMember(false)}
                    className="
                        bg-gray-300
                        dark:bg-slate-700
                        text-slate-800
                        dark:text-slate-200
                        px-4
                        py-2
                        rounded-lg
                        hover:bg-gray-400
                        dark:hover:bg-slate-600
                        transition
                    "
                >
                    Cancel
                </button>

            </div>
        </div>
    </div>
)}
                    </div>
                </div>
            </div>

{/* tasks */}

<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">

    <div className="flex justify-between items-center">

        <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Tasks
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {tasks.length}
            </span>
            {overdueCount > 0 && (
                <button
                    type="button"
                    onClick={() =>
                        setTaskFilters((prev) => ({ ...prev, sortBy: "smart" }))
                    }
                    title="Smart sort overdue tasks ko upar rakhta hai"
                    className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400"
                >
                    {overdueCount} overdue
                </button>
            )}
        </div>

        <div className="flex items-center gap-2">

        {tasks.length > 0 && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {[
                    { key: "list", label: "List", Icon: ListIcon },
                    { key: "board", label: "Board", Icon: LayoutGrid },
                ].map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => changeTaskView(key)}
                        aria-pressed={taskView === key}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                            taskView === key
                                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>
        )}

        {isAdmin && (
            <button
                onClick={() => setShowAddTask(true)}
                className="
                    bg-green-600
                    text-white
                    px-3
                    py-2
                    rounded-lg
                    hover:bg-green-700
                    transition
                "
            >
                Add Task
            </button>
        )}

        </div>

    </div>


    {tasks.length > 0 && (
        <TaskToolbar
            filters={taskFilters}
            onChange={setTaskFilters}
            members={members}
            showStatus={taskView === "list"}
            totalCount={taskView === "board" ? tasks.length : totalTaskCount}
            visibleCount={taskView === "board" ? boardTasks.length : visibleTaskCount}
        />
    )}

    {taskView === "board" && tasks.length > 0 ? (
        <KanbanBoard
            tasks={boardTasks}
            sortBy={taskFilters.sortBy}
            isAdmin={isAdmin}
            userId={currentUser?._id}
            onMove={handleMoveTask}
            projectId={projectId}
        />
    ) : (
    <div className="mt-5 space-y-3">

        {!isAdmin && (
            <div className="mb-5">
                <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    My Tasks
                </h3>
            </div>
        )}


        {tasks.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 mt-2">
                No tasks yet
            </p>
        ) : visibleTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700 animate-fade-in">
                <p className="text-slate-500 dark:text-slate-400">
                    {filtersActive
                        ? "No tasks match your filters"
                        : "No tasks assigned to you yet"}
                </p>
                {filtersActive && (
                    <button
                        type="button"
                        onClick={() =>
                            setTaskFilters((prev) => ({
                                ...DEFAULT_TASK_FILTERS,
                                sortBy: prev.sortBy,
                            }))
                        }
                        className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        ) : (
            visibleTasks.map((task) => (

                <Link
                    key={task._id}
                    to={`/projects/${projectId}/tasks/${task._id}`}
                    className={`
                        ${isOverdue(task) ? "border-l-4 border-l-red-500" : ""}
                        block
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-2xl
                        p-5
                        mb-5
                        bg-white
                        dark:bg-slate-800
                        shadow-sm
                        hover:shadow-lg
                        dark:hover:shadow-slate-950/30
                        transition-all
                        duration-300
                        hover:-translate-y-1
                        animate-fade-in-up
                    `}
                >

                    <div className="flex justify-between items-start">

                        <div>

                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {task.title}
                            </h3>

                            <p className="text-slate-500 dark:text-slate-400 mt-2">
                                {task.description}
                            </p>

                        </div>


                        <span
                            className={`
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-semibold

                                ${
                                    task.status === "completed"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                        : task.status === "in_review"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                        : task.status === "in_progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                                }
                            `}
                        >
                            {task.status === "todo"
                                ? "Todo"
                                : task.status === "in_progress"
                                ? "In Progress"
                                : task.status === "in_review"
                                ? "In Review"
                                : "Completed"}
                        </span>

                    </div>


                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5">

                        <div
                            className={`
                                flex
                                items-center
                                gap-2
                                text-sm
                                font-medium

                                ${
                                    task.priority === "high"
                                        ? "text-red-600 dark:text-red-400"
                                        : task.priority === "medium"
                                        ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-green-600 dark:text-green-400"
                                }
                            `}
                        >

                            <Flag size={16} />

                            {task.priority.charAt(0).toUpperCase() +
                                task.priority.slice(1)}

                        </div>


                        <div className={`flex items-center gap-2 text-sm ${
                            isOverdue(task)
                                ? "font-semibold text-red-600 dark:text-red-400"
                                : "text-slate-600 dark:text-slate-400"
                        }`}>

                            <Calendar size={16} />

                            {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : "No Due Date"}

                        </div>

                        <DueBadge task={task} />

                    </div>


                    {task.attachments?.length > 0 && (
                        <div className="mt-5">

                            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 mb-3">

                                <Paperclip size={16} />

                                Attachments ({task.attachments.length})

                            </div>


                            <div className="space-y-2">

                                {task.attachments.map((file) => (

                                    <a
                                        key={file._id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) =>
                                            e.stopPropagation()
                                        }
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            border
                                            border-slate-200
                                            dark:border-slate-700
                                            rounded-lg
                                            px-3
                                            py-2
                                            hover:bg-slate-50
                                            dark:hover:bg-slate-700
                                            transition
                                        "
                                    >

                                        <div>

                                            <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
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

                        </div>
                    )}


                    {task.links?.length > 0 && (
                        <div className="mt-5">

                            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 mb-3">
                                <Link2 size={16} />
                                Links ({task.links.length})
                            </div>

                            <div className="space-y-2">
                                {task.links.map((link) => (
                                    <a
                                        key={link._id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        <p className="font-medium text-sm text-blue-600 dark:text-blue-400 truncate">
                                            🔗 {link.title || link.url}
                                        </p>
                                        <ExternalLink size={16} className="text-slate-500 shrink-0 ml-2" />
                                    </a>
                                ))}
                            </div>

                        </div>
                    )}


                    {isAdmin && (
                        <div className="flex justify-end gap-3 mt-6">

                            <button
                                onClick={(e) => {

                                    e.preventDefault();
                                    e.stopPropagation();

                                    openEditTask(task);

                                }}
                                className="
                                    flex
                                    items-center
                                    gap-2
                                    bg-blue-600
                                    hover:bg-blue-700
                                    text-white
                                    px-4
                                    py-2
                                    rounded-lg
                                    transition
                                    cursor-pointer
                                "
                            >
                                <SquarePen size={18} />
                                Edit
                            </button>


                            <button
                                onClick={(e) => {

                                    e.preventDefault();
                                    e.stopPropagation();

                                    handleDeleteTask(task._id);

                                }}
                                className="
                                    flex
                                    items-center
                                    gap-2
                                    bg-red-600
                                    hover:bg-red-700
                                    text-white
                                    px-4
                                    py-2
                                    rounded-lg
                                    transition
                                    cursor-pointer
                                "
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>

                        </div>
                    )}

                </Link>

            ))
        )}


        {!isAdmin && visibleOtherTasks.length > 0 && (
            <>

                <div className="my-8 border-t border-slate-200 dark:border-slate-700 pt-6">

                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        Other Members' Tasks
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        You can only view these tasks.
                    </p>

                </div>


                <div className="space-y-3">

                    {visibleOtherTasks.map((task) => (

                        <Link
                            key={task._id}
                            to={`/projects/${projectId}/tasks/${task._id}`}
                            className="
                                block
                                border
                                border-slate-200
                                dark:border-slate-700
                                rounded-2xl
                                p-5
                                bg-gray-50
                                dark:bg-slate-800
                                hover:bg-gray-100
                                dark:hover:bg-slate-700
                                transition
                            "
                        >

                            <div className="flex justify-between">

                                <div>

                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        {task.title}
                                    </h3>

                                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                                        {task.description}
                                    </p>

                                    <DueBadge task={task} className="mt-3" />

                                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-3">
                                        Assigned to:

                                        <span className="font-semibold ml-1 text-slate-900 dark:text-slate-100">
                                            {task.assignedTo?.username || "Unassigned"}
                                        </span>
                                    </p>

                                </div>


                                <span
                                    className={`
                                        px-3
                                        py-1
                                        rounded-full
                                        text-xs
                                        font-semibold

                                        ${
                                            task.status === "todo"
                                                ? "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                                                : task.status === "in_progress"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                                : task.status === "in_review"
                                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                        }
                                    `}
                                >
                                    {task.status
                                        .replaceAll("_", " ")
                                        .replace(/\b\w/g, (c) =>
                                            c.toUpperCase()
                                        )}
                                </span>

                            </div>

                        </Link>

                    ))}

                </div>

            </>

        )}

    </div>
    )}


    {/* =========================
        CREATE TASK MODAL
    ========================= */}

    {showAddTask && (
        <div
            className="
                fixed
                inset-0
                bg-black/40
                dark:bg-black/60
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
                    border-transparent
                    dark:border-slate-700
                    rounded-2xl
                    p-6
                    w-100
                    max-h-[90vh]
                    overflow-y-auto
                    space-y-4
                    shadow-xl
                "
            >

                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Create Task
                </h2>


                <input
                    type="text"
                    placeholder="Task title"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={taskData.title}
                    onChange={(e) =>
                        setTaskData({
                            ...taskData,
                            title: e.target.value,
                        })
                    }
                />


                <textarea
                    placeholder="Description"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={taskData.description}
                    onChange={(e) =>
                        setTaskData({
                            ...taskData,
                            description: e.target.value,
                        })
                    }
                />


                <select
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={taskData.assignedTo}
                    onChange={(e) =>
                        setTaskData({
                            ...taskData,
                            assignedTo: e.target.value,
                        })
                    }
                >

                    <option value="">
                        Assign member
                    </option>

                    {members.map((member) => (
                        <option
                            key={member.user._id}
                            value={member.user._id}
                        >
                            {member.user.username}
                        </option>
                    ))}

                </select>


                <select
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={taskData.priority}
                    onChange={(e) =>
                        setTaskData({
                            ...taskData,
                            priority: e.target.value,
                        })
                    }
                >

                    <option value="low">
                        Low Priority
                    </option>

                    <option value="medium">
                        Medium Priority
                    </option>

                    <option value="high">
                        High Priority
                    </option>

                </select>


                <input
                    type="date"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={taskData.dueDate}
                    onChange={(e) =>
                        setTaskData({
                            ...taskData,
                            dueDate: e.target.value,
                        })
                    }
                />


                <div className="space-y-4">

                    <div>

                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Attach Files
                        </label>


                        <label
                            htmlFor="taskFiles"
                            className="
                                flex
                                items-center
                                justify-center
                                border-2
                                border-dashed
                                border-slate-300
                                dark:border-slate-600
                                rounded-lg
                                p-5
                                cursor-pointer
                                hover:bg-gray-50
                                dark:hover:bg-slate-800
                                transition
                            "
                        >

                            <div className="text-center">

                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                    Click to choose files
                                </p>

                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    PDF, ZIP, Images, Docs...
                                </p>

                            </div>

                        </label>


                        <input
                            id="taskFiles"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) =>
                                setTaskFiles(
                                    Array.from(e.target.files)
                                )
                            }
                        />


                        {taskFiles.length > 0 && (
                            <div className="mt-4 space-y-2">

                                {taskFiles.map((file, index) => (

                                    <div
                                        key={index}
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            bg-gray-100
                                            dark:bg-slate-800
                                            border
                                            border-transparent
                                            dark:border-slate-700
                                            rounded-lg
                                            px-3
                                            py-2
                                        "
                                    >

                                        <span className="text-sm truncate text-slate-700 dark:text-slate-200">
                                            📄 {file.name}
                                        </span>

                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </span>

                                    </div>

                                ))}

                            </div>
                        )}

                    </div>


                    {/* ===== Attach Links ===== */}
                    <div>

                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                            Attach Links
                        </label>

                        <div className="flex flex-col sm:flex-row gap-2">

                            <input
                                type="text"
                                placeholder="Title (optional)"
                                value={linkInput.title}
                                onChange={(e) =>
                                    setLinkInput({ ...linkInput, title: e.target.value })
                                }
                                className="sm:w-1/3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2"
                            />

                            <input
                                type="url"
                                placeholder="https://..."
                                value={linkInput.url}
                                onChange={(e) =>
                                    setLinkInput({ ...linkInput, url: e.target.value })
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddLink();
                                    }
                                }}
                                className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2"
                            />

                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                            >
                                Add
                            </button>

                        </div>

                        {taskLinks.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {taskLinks.map((link, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2"
                                    >
                                        <span className="flex items-center gap-2 text-sm truncate text-slate-700 dark:text-slate-200">
                                            <Link2 size={14} />
                                            {link.title || link.url}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLink(index)}
                                            className="text-slate-500 hover:text-red-500"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>


                    <div className="flex gap-3">

                        <button
                            onClick={handleCreateTask}
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
                            Create
                        </button>


                        <button
                            onClick={() =>
                                setShowAddTask(false)
                            }
                            className="
                                bg-gray-200
                                hover:bg-gray-300
                                dark:bg-slate-700
                                dark:hover:bg-slate-600
                                text-slate-800
                                dark:text-slate-200
                                px-4
                                py-2
                                rounded-lg
                                transition
                            "
                        >
                            Cancel
                        </button>

                    </div>

                </div>

            </div>

        </div>
    )}


    {/* =========================
        EDIT TASK MODAL
    ========================= */}

    {showEditTask && (
        <div
            className="
                fixed
                inset-0
                bg-black/40
                dark:bg-black/60
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
                    border-transparent
                    dark:border-slate-700
                    rounded-2xl
                    p-6
                    w-125
                    max-h-[90vh]
                    overflow-y-auto
                    shadow-xl
                "
            >

                <h2 className="text-2xl font-bold mb-5 text-slate-900 dark:text-slate-100">
                    Edit Task
                </h2>


                <input
                    type="text"
                    placeholder="Title"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={editTaskData.title}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            title: e.target.value,
                        })
                    }
                />


                <textarea
                    placeholder="Description"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    rows={4}
                    value={editTaskData.description}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            description: e.target.value,
                        })
                    }
                />


                <select
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={editTaskData.assignedTo}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            assignedTo: e.target.value,
                        })
                    }
                >

                    {members.map((member) => (
                        <option
                            key={member.user._id}
                            value={member.user._id}
                        >
                            {member.user.username}
                        </option>
                    ))}

                </select>


                <select
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={editTaskData.priority}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            priority: e.target.value,
                        })
                    }
                >

                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>

                </select>


                <select
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={editTaskData.status}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            status: e.target.value,
                        })
                    }
                >

                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>

                </select>


                <input
                    type="date"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        w-full
                        p-3
                        rounded-lg
                        mb-5
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={editTaskData.dueDate}
                    onChange={(e) =>
                        setEditTaskData({
                            ...editTaskData,
                            dueDate: e.target.value,
                        })
                    }
                />


                {/* ===== Edit: Attachments ===== */}
                <div className="mb-5">

                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        Attachments
                    </label>

                    {editExistingFiles.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {editExistingFiles.map((file) => {
                                const removed = removedAttachmentIds.includes(file._id);
                                return (
                                    <div
                                        key={file._id}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                                            removed
                                                ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
                                                : "border-slate-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
                                        }`}
                                    >
                                        <span
                                            className={`text-sm truncate ${
                                                removed
                                                    ? "line-through text-red-500"
                                                    : "text-slate-700 dark:text-slate-200"
                                            }`}
                                        >
                                            📄 {file.filename}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => toggleRemoveAttachment(file._id)}
                                            className={`text-xs font-medium ml-2 shrink-0 ${
                                                removed
                                                    ? "text-blue-600 hover:underline"
                                                    : "text-red-500 hover:underline"
                                            }`}
                                        >
                                            {removed ? "Undo" : "Remove"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <label
                        htmlFor="editTaskFiles"
                        className="flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm text-slate-600 dark:text-slate-300"
                    >
                        <Paperclip size={16} className="mr-2" />
                        Add more files
                    </label>

                    <input
                        id="editTaskFiles"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const picked = Array.from(e.target.files);
                            setEditNewFiles((prev) => [...prev, ...picked]);
                            e.target.value = "";
                        }}
                    />

                    {editNewFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {editNewFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2"
                                >
                                    <span className="text-sm truncate text-slate-700 dark:text-slate-200">
                                        ➕ {file.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditNewFiles((prev) =>
                                                prev.filter((_, i) => i !== index)
                                            )
                                        }
                                        className="text-slate-500 hover:text-red-500 ml-2"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </div>


                {/* ===== Edit: Links ===== */}
                <div className="mb-5">

                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        Links
                    </label>

                    {editLinks.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {editLinks.map((link, index) => (
                                <div
                                    key={link._id || `new-${index}`}
                                    className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2"
                                >
                                    <a
                                        href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm truncate text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        <Link2 size={14} className="shrink-0" />
                                        {link.title || link.url}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveEditLink(index)}
                                        className="text-slate-500 hover:text-red-500 ml-2"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Title (optional)"
                            value={editLinkInput.title}
                            onChange={(e) =>
                                setEditLinkInput({ ...editLinkInput, title: e.target.value })
                            }
                            className="sm:w-1/3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2"
                        />
                        <input
                            type="url"
                            placeholder="https://..."
                            value={editLinkInput.url}
                            onChange={(e) =>
                                setEditLinkInput({ ...editLinkInput, url: e.target.value })
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddEditLink();
                                }
                            }}
                            className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2"
                        />
                        <button
                            type="button"
                            onClick={handleAddEditLink}
                            className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                        >
                            Add
                        </button>
                    </div>

                </div>


                {editError && (
                    <p className="mb-4 text-sm text-red-500">
                        {editError}
                    </p>
                )}


                <div className="flex justify-end gap-3">

                    <button
                        onClick={closeEditTask}
                        className="
                            bg-gray-200
                            hover:bg-gray-300
                            dark:bg-slate-700
                            dark:hover:bg-slate-600
                            text-slate-800
                            dark:text-slate-200
                            px-4
                            py-2
                            rounded-lg
                            transition
                        "
                    >
                        Cancel
                    </button>


                    <button
                        onClick={handleEditTask}
                        disabled={editSaving}
                        className="
                            bg-blue-600
                            hover:bg-blue-700
                            disabled:opacity-60
                            disabled:cursor-not-allowed
                            text-white
                            px-4
                            py-2
                            rounded-lg
                            transition
                        "
                    >
                        {editSaving ? "Saving..." : "Save"}
                    </button>

                </div>

            </div>

        </div>
    )}

</div>

{/* notes */}
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">

    <div className="flex justify-between items-center">

        <h2 className="font-semibold text-xl text-slate-900 dark:text-slate-100">
            Notes
        </h2>

        <button
            onClick={() => setShowAddNote(true)}
            className="
                bg-green-600
                hover:bg-green-700
                text-white
                px-3
                py-2
                rounded-lg
                text-sm
                transition
            "
        >
            Add Note
        </button>

    </div>


    <div className="space-y-4 mt-5">

        {notes.length === 0 ? (

            <p className="text-slate-500 dark:text-slate-400">
                No notes yet.
            </p>

        ) : (

            notes.map((note) => (

                <div
                    key={note._id}
                    className="
                        border
                        border-slate-200
                        dark:border-slate-700
                        rounded-xl
                        p-4
                        bg-white
                        dark:bg-slate-800
                    "
                >

                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {note.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-300 mt-2">
                        {note.content}
                    </p>

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                        By {note.createdBy?.username}
                    </p>


                    {isAdmin && (

                        <div className="flex gap-3 mt-3">

                            <button
                                onClick={() => {
                                    setSelectedNote(note);

                                    setEditNoteData({
                                        title: note.title,
                                        content: note.content,
                                    });

                                    setShowEditNote(true);
                                }}
                                className="
                                    text-blue-600
                                    dark:text-blue-400
                                    hover:text-blue-700
                                    dark:hover:text-blue-300
                                    text-sm
                                    cursor-pointer
                                "
                            >
                                Edit
                            </button>


                            <button
                                onClick={() =>
                                    handleDeleteNote(note._id)
                                }
                                className="
                                    text-red-600
                                    dark:text-red-400
                                    hover:text-red-700
                                    dark:hover:text-red-300
                                    text-sm
                                    cursor-pointer
                                "
                            >
                                Delete
                            </button>

                        </div>

                    )}

                </div>

            ))

        )}

    </div>


    {showAddNote && (

        <div
            className="
                fixed
                inset-0
                bg-black/40
                dark:bg-black/60
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
                    border-transparent
                    dark:border-slate-700
                    p-6
                    rounded-xl
                    w-100
                    shadow-xl
                "
            >

                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                    Create Note
                </h2>


                <input
                    type="text"
                    placeholder="Title"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        mb-3
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    value={noteData.title}
                    onChange={(e) =>
                        setNoteData({
                            ...noteData,
                            title: e.target.value,
                        })
                    }
                />


                <textarea
                    placeholder="Content"
                    className="
                        border
                        border-slate-300
                        dark:border-slate-700
                        bg-white
                        dark:bg-slate-800
                        text-slate-900
                        dark:text-slate-100
                        placeholder:text-slate-400
                        dark:placeholder:text-slate-500
                        w-full
                        p-3
                        rounded-lg
                        mb-4
                        outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                    rows="5"
                    value={noteData.content}
                    onChange={(e) =>
                        setNoteData({
                            ...noteData,
                            content: e.target.value,
                        })
                    }
                />


                <div className="flex gap-3">

                    <button
                        onClick={handleCreateNote}
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
                        Create
                    </button>


                    <button
                        onClick={() => {

                            setShowAddNote(false);

                            setNoteData({
                                title: "",
                                content: "",
                            });

                        }}
                        className="
                            bg-gray-200
                            hover:bg-gray-300
                            dark:bg-slate-700
                            dark:hover:bg-slate-600
                            text-slate-800
                            dark:text-slate-200
                            px-4
                            py-2
                            rounded-lg
                            transition
                        "
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>

    )}

                {showEditNote && (
                    <div
                        className="
fixed
inset-0
bg-black/40
flex
items-center
justify-center
z-50
"
                    >
                        <div
                            className="
bg-white
p-6
rounded-xl
w-100
"
                        >
                            <h2 className="text-xl font-bold mb-4">Edit Note</h2>

                            <input
                                className="
border
w-full
p-3
rounded-lg
mb-3
"
                                value={editNoteData.title}
                                onChange={(e) =>
                                    setEditNoteData({
                                        ...editNoteData,
                                        title: e.target.value,
                                    })
                                }
                            />

                            <textarea
                                className="
border
w-full
p-3
rounded-lg
mb-4
"
                                rows="5"
                                value={editNoteData.content}
                                onChange={(e) =>
                                    setEditNoteData({
                                        ...editNoteData,
                                        content: e.target.value,
                                    })
                                }
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={handleUpdateNote}
                                    className="
                                      bg-blue-600
                                      text-white
                                      px-4
                                      py-2
                                      rounded-lg
                                      "
                                >
                                    Save
                                </button>

                                <button
                                    onClick={() => {

    setShowEditNote(false);

    setSelectedNote(null);

    setEditNoteData({
        title: "",
        content: "",
    });

}}
                                    className="
bg-gray-300
px-4
py-2
rounded-lg
"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

{/* acitivity */}
<div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">

    <h2 className="text-xl font-semibold mb-5 text-slate-900 dark:text-slate-100">
        Recent Activity
    </h2>

    {activityLoading ? (
        <p className="text-gray-500 dark:text-slate-400">
            Loading...
        </p>
    ) : activities.length === 0 ? (
        <div className="text-center py-8">

            <p className="text-4xl">
                📜
            </p>

            <p className="text-gray-500 dark:text-slate-400 mt-3">
                No activity yet
            </p>

        </div>
    ) : (
        <div className="space-y-5">

            {activities.map((activity) => (

                <div
                    key={activity._id}
                    className="flex gap-4"
                >

                    <div
                        className="
                            w-10
                            h-10
                            rounded-full
                            bg-blue-100
                            dark:bg-blue-900/40
                            flex
                            items-center
                            justify-center
                            font-bold
                            text-blue-700
                            dark:text-blue-400
                            shrink-0
                        "
                    >
                        {activity.user?.username
                            ?.charAt(0)
                            .toUpperCase()}
                    </div>


                    <div className="flex-1">

                        <p className="text-sm text-slate-700 dark:text-slate-300">

                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {activity.user?.username}
                            </span>{" "}

                            {activity.description}

                        </p>


                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">

                            {formatDistanceToNow(
                                new Date(activity.createdAt),
                                {
                                    addSuffix: true,
                                }
                            )}

                        </p>

                    </div>

                </div>

            ))}

        </div>
    )}

</div>

        {/* Project group chat (neeche-right button) */}
        <ProjectChat
            projectId={projectId}
            projectName={project?.name}
            currentUser={currentUser}
            isAdmin={isAdmin}
        />

        </div>
	);
}