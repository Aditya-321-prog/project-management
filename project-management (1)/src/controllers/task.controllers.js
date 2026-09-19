import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import {
  AvailableUserRole,
  UserRolesEnum,
  AvailableTaskStatues,
  TaskStatusEnum,
} from "../utils/constants.js";
import { Notification } from "../models/notification.models.js";
import { logActivity } from "../utils/logActivity.js";
import { ProjectMember } from "../models/projectmember.models.js";
import fs from "fs";
import { getIO } from "../socket/socket.js";
import { Comment } from "../models/comment.models.js";
import {
  storeUploadedFiles,
  deleteStoredFiles,
  removeTempUploads,
} from "../utils/storage.js";

// ==========================================
// Helpers: links
// ==========================================

// FormData se aaye JSON string ko array me badalta hai
const parseJSONField = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
};

// Links ko clean + validate karta hai.
// Purane links (jinka _id hai) ka addedBy/addedAt same rehta hai.
const normalizeLinks = (links, userId, existingLinks = []) => {
  if (!Array.isArray(links)) return [];

  return links
    .filter((link) => link?.url?.trim())
    .map((link) => {
      let url = link.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      try {
        new URL(url);
      } catch {
        throw new ApiError(400, `Invalid link: ${link.url}`);
      }

      const old = link._id
        ? existingLinks.find((l) => l._id?.toString() === link._id)
        : null;

      return {
        ...(old ? { _id: old._id, addedAt: old.addedAt } : {}),
        title: link.title?.trim() || url,
        url,
        addedBy: old?.addedBy || userId,
      };
    });
};

// Multer files -> Cloudinary / local par save karke attachment objects
const buildAttachments = async (req, files, folder = "task-attachments") => {
  const stored = await storeUploadedFiles(req, files, folder);
  return files.map((file, i) => ({
    filename: file.originalname,
    url: stored[i].url,
    localPath: stored[i].localPath,
    publicId: stored[i].publicId,
    resourceType: stored[i].resourceType,
    mimetype: file.mimetype,
    size: file.size,
    uploadedBy: req.user._id,
  }));
};

// Upload ho chuki files hata do (jab request fail ho jaye)
const cleanupUploadedFiles = (files = []) => removeTempUploads(files);

// Task dhoondo aur check karo ki wo isi project ka hai.
// Pehle sirf taskId se dhoondte the - kisi dusre project ka admin
// URL me apna projectId aur tumhara taskId daal kar tumhara task
// dekh / review / comment kar sakta tha.
const findTaskInProject = async (taskId, projectId) => {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid task id");
  }

  const task = await Task.findById(taskId);

  if (!task || task.project.toString() !== projectId.toString()) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const canManageChecklist = (req, task) =>
  req.user.role === UserRolesEnum.ADMIN ||
  task.assignedTo?.toString() === req.user._id.toString();

// Ek se zyada members ko socket event
const emitToProjectMembers = async (projectId, event, payload) => {
  const members = await ProjectMember.find({ project: projectId })
    .select("user")
    .lean();

  for (const member of members) {
    getIO().to(member.user.toString()).emit(event, payload);
  }
};



const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  // submissions list page par use nahi hoti - bhejna bekaar data tha
  const tasks = await Task.find({
    project: projectId,
  })
    .select("-submissions")
    .populate("assignedTo", "avatar username fullName")
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Task fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    assignedTo,
    status,
    priority,
    dueDate,
    links,
  } = req.body;

  const { projectId } = req.params;
  const uploadedFiles = req.files || [];
  let storedAttachments = [];

  try {
    if (!title?.trim()) {
      throw new ApiError(400, "Title is required");
    }

    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // links FormData me JSON string ban ke aate hain
    const taskLinks = normalizeLinks(
      parseJSONField(links, "links"),
      req.user._id,
    );

    if (assignedTo) {
      const member = await ProjectMember.findOne({
        project: projectId,
        user: assignedTo,
      });

      if (!member) {
        throw new ApiError(400, "User is not a member of this project");
      }
    }

    storedAttachments = await buildAttachments(req, uploadedFiles);

    const task = await Task.create({
      title: title.trim(),
      description,
      project: projectId,
      assignedTo: assignedTo || undefined,
      status: status || undefined,
      assignedBy: req.user._id,
      attachments: storedAttachments,
      links: taskLinks,
      priority: priority || undefined,
      dueDate: dueDate || undefined,
    });

    await task.populate("assignedTo", "avatar username fullName");

    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: assignedTo,
        title: "New Task Assigned",
        message: `You have been assigned task "${task.title}".`,
        type: "task",
      });

      getIO().to(assignedTo.toString()).emit("new-notification", notification);
    }

    // Project ke sab members ki list real-time update ho
    await emitToProjectMembers(projectId, "task-created", task);

    await logActivity({
      project: projectId,
      user: req.user._id,
      action: "TASK_CREATED",
      entityType: "task",
      entityId: task._id,
      description: `${req.user.username} created task "${task.title}"`,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, task, "Task created successfully"));
  } catch (error) {
    cleanupUploadedFiles(uploadedFiles);
    // Task nahi bana to cloud par gayi files bhi hata do
    await deleteStoredFiles(storedAttachments);
    throw error;
  }
});

// ==========================================
// My Tasks: saare projects ke tasks ek jagah
// scope=assigned -> jo mujhe assign hue
// scope=created  -> jo maine (admin ne) doosron ko diye
// ==========================================
const getMyTasks = asyncHandler(async (req, res) => {
  const scope = req.query.scope === "created" ? "created" : "assigned";

  // Sirf un projects ke tasks jinka main abhi bhi member hoon
  const projectIds = await ProjectMember.find({ user: req.user._id }).distinct(
    "project",
  );

  const query = {
    project: { $in: projectIds },
    ...(scope === "created"
      ? { assignedBy: req.user._id }
      : { assignedTo: req.user._id }),
  };

  const tasks = await Task.find(query)
    .select("-submissions -attachments.localPath")
    .populate("project", "name")
    .populate("assignedTo", "avatar username fullName")
    .populate("assignedBy", "avatar username fullName")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "My tasks fetched successfully"));
});

// ==========================================
// Kanban: sirf status badalna (drag & drop)
// Admin      -> koi bhi status
// Assigned   -> sirf Todo <-> In Progress
//               (In Review submission se hota hai, Completed approval se)
// ==========================================
const MEMBER_ALLOWED_STATUSES = [TaskStatusEnum.TODO, TaskStatusEnum.IN_PROGRESS];

const STATUS_LABELS = {
  [TaskStatusEnum.TODO]: "Todo",
  [TaskStatusEnum.IN_PROGRESS]: "In Progress",
  [TaskStatusEnum.IN_REVIEW]: "In Review",
  [TaskStatusEnum.COMPLETED]: "Completed",
};

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { status } = req.body;

  if (!AvailableTaskStatues.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const task = await findTaskInProject(taskId, projectId);

  const isAdmin = req.user.role === UserRolesEnum.ADMIN;
  const isAssignee = task.assignedTo?.toString() === req.user._id.toString();

  if (!isAdmin) {
    if (!isAssignee) {
      throw new ApiError(403, "Only the assigned member or an admin can move this task");
    }
    if (
      !MEMBER_ALLOWED_STATUSES.includes(task.status) ||
      !MEMBER_ALLOWED_STATUSES.includes(status)
    ) {
      throw new ApiError(
        403,
        "You can only move tasks between Todo and In Progress. Submit your work for review.",
      );
    }
  }

  if (task.status === status) {
    await task.populate("assignedTo", "avatar username fullName");
    return res.status(200).json(new ApiResponse(200, task, "Status unchanged"));
  }

  const previousStatus = task.status;
  task.status = status;
  await task.save();
  await task.populate("assignedTo", "avatar username fullName");

  // Doosre bande ko batao: admin ne move kiya -> assignee ko, assignee ne -> admin ko
  const recipient = isAssignee ? task.assignedBy : task.assignedTo?._id;
  if (recipient && recipient.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      recipient,
      title: "Task Status Changed",
      message: `${req.user.username} moved "${task.title}" to ${STATUS_LABELS[status]}.`,
      type: "task",
    });
    getIO().to(recipient.toString()).emit("new-notification", notification);
  }

  await emitToProjectMembers(projectId, "task-updated", task);

  await logActivity({
    project: task.project,
    user: req.user._id,
    action: "TASK_STATUS_CHANGED",
    entityType: "task",
    entityId: task._id,
    description: `${req.user.username} moved "${task.title}" from ${STATUS_LABELS[previousStatus]} to ${STATUS_LABELS[status]}`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task status updated"));
});

const getTaskById = asyncHandler(async (req, res) => {

    const { taskId, projectId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
        throw new ApiError(400, "Invalid task id");
    }

    const task = await Task.aggregate([

        // 1. Find the task (sirf isi project ka)
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
                project: new mongoose.Types.ObjectId(projectId),
            },
        },


        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedToUser",
            },
        },

  
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedByUser",
            },
        },

        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks",
            },
        },


        {
            $lookup: {
                from: "users",
                localField: "subtasks.createdBy",
                foreignField: "_id",
                as: "subtaskCreators",
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "submissions.submittedBy",
                foreignField: "_id",
                as: "submissionUsers",
            },
        },

        
        {
            $lookup: {
                from: "users",
                localField: "submissions.reviewedBy",
                foreignField: "_id",
                as: "reviewUsers",
            },
        },

        {
            $addFields: {
                assignedTo: {
                    $arrayElemAt: ["$assignedToUser", 0],
                },

                assignedBy: {
                    $arrayElemAt: ["$assignedByUser", 0],
                },
            },
        },

        {
            $addFields: {
                subtasks: {
                    $map: {
                        input: "$subtasks",
                        as: "subtask",

                        in: {
                            $mergeObjects: [
                                "$$subtask",

                                {
                                    createdBy: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$subtaskCreators",
                                                    as: "creator",

                                                    cond: {
                                                        $eq: [
                                                            "$$creator._id",
                                                            "$$subtask.createdBy",
                                                        ],
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },

        {
            $addFields: {
                submissions: {
                    $map: {
                        input: {
                            $ifNull: ["$submissions", []],
                        },

                        as: "submission",

                        in: {
                            $mergeObjects: [
                                "$$submission",

                                {
                                    submittedBy: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$submissionUsers",

                                                    as: "user",

                                                    cond: {
                                                        $eq: [
                                                            "$$user._id",
                                                            "$$submission.submittedBy",
                                                        ],
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },

                                    reviewedBy: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$reviewUsers",

                                                    as: "user",

                                                    cond: {
                                                        $eq: [
                                                            "$$user._id",
                                                            "$$submission.reviewedBy",
                                                        ],
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },
        {
            $project: {

                _id: 1,

                title: 1,

                description: 1,

                status: 1,

                // Ye 3 fields pehle missing the - Task Details page par
                // priority khaali aur "No due date" hi dikhta tha
                priority: 1,

                dueDate: 1,

                project: 1,

                createdAt: 1,

                updatedAt: 1,

                attachments: 1,

                links: 1,

            
                assignedTo: {
                    _id: "$assignedTo._id",
                    username: "$assignedTo.username",
                    fullName: "$assignedTo.fullName",
                    avatar: "$assignedTo.avatar",
                },

               // creator
                assignedBy: {
                    _id: "$assignedBy._id",
                    username: "$assignedBy.username",
                    fullName: "$assignedBy.fullName",
                    avatar: "$assignedBy.avatar",
                },

                // Subtasks
                subtasks: {
                    $map: {

                        input: {
                            $ifNull: ["$subtasks", []],
                        },

                        as: "subtask",

                        in: {

                            _id: "$$subtask._id",

                            title: "$$subtask.title",

                            status: "$$subtask.status",

                            isCompleted: "$$subtask.isCompleted",

                            createdAt: "$$subtask.createdAt",

                            updatedAt: "$$subtask.updatedAt",

                            createdBy: {
                                _id: "$$subtask.createdBy._id",

                                username:
                                    "$$subtask.createdBy.username",

                                fullName:
                                    "$$subtask.createdBy.fullName",

                                avatar:
                                    "$$subtask.createdBy.avatar",
                            },
                        },
                    },
                },

                // Submissions
                submissions: {
                    $map: {

                        input: {
                            $ifNull: ["$submissions", []],
                        },

                        as: "submission",

                        in: {

                            _id: "$$submission._id",

                            status: "$$submission.status",

                            files: "$$submission.files",

                            submittedAt:
                                "$$submission.submittedAt",

                            reviewedAt:
                                "$$submission.reviewedAt",

                            feedback:
                                "$$submission.feedback",

                            submittedBy: {
                                _id:
                                    "$$submission.submittedBy._id",

                                username:
                                    "$$submission.submittedBy.username",

                                fullName:
                                    "$$submission.submittedBy.fullName",

                                avatar:
                                    "$$submission.submittedBy.avatar",
                            },

                            reviewedBy: {
                                _id:
                                    "$$submission.reviewedBy._id",

                                username:
                                    "$$submission.reviewedBy.username",

                                fullName:
                                    "$$submission.reviewedBy.fullName",

                                avatar:
                                    "$$submission.reviewedBy.avatar",
                            },
                        },
                    },
                },
            },
        },
    ]);

    // Task doesn't exist
    if (!task || task.length === 0) {
        throw new ApiError(
            404,
            "Task not found"
        );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                task[0],
                "Task fetched successfully"
            )
        );
});

const updateTask = asyncHandler(async (req, res) => {

    const { projectId, taskId } = req.params;

    const {
        title,
        description,
        assignedTo,
        status,
        priority,
        dueDate,
        links,
        removedAttachments,
    } = req.body;

    const newFiles = req.files || [];
    let newStored = [];

    try {

        const task = await Task.findById(taskId);

        if (!task) {
            throw new ApiError(404, "Task not found");
        }

        if (task.project.toString() !== projectId) {
            throw new ApiError(403, "Invalid project");
        }

        // ---------- Basic fields ----------
        if (title !== undefined) {
            if (!title.trim()) {
                throw new ApiError(400, "Title is required");
            }
            task.title = title.trim();
        }

        if (description !== undefined) task.description = description;
        if (status) task.status = status;
        if (priority) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate || null;

        // ---------- Assignee ----------
        const previousAssignee = task.assignedTo?.toString() || null;

        if (assignedTo !== undefined) {
            if (assignedTo) {
                const member = await ProjectMember.findOne({
                    project: projectId,
                    user: assignedTo,
                });

                if (!member) {
                    throw new ApiError(400, "User is not a member of this project");
                }

                task.assignedTo = assignedTo;
            } else {
                task.assignedTo = null;
            }
        }

        // ---------- Links (poori final list aati hai) ----------
        const parsedLinks = parseJSONField(links, "links");
        if (parsedLinks !== undefined) {
            task.links = normalizeLinks(parsedLinks, req.user._id, task.links);
        }

        // ---------- Attachments hatana ----------
        const removeIds = parseJSONField(removedAttachments, "removedAttachments") || [];
        const filesToDelete = [];

        if (Array.isArray(removeIds) && removeIds.length) {
            task.attachments = task.attachments.filter((file) => {
                if (removeIds.includes(file._id.toString())) {
                    filesToDelete.push(file);
                    return false;
                }
                return true;
            });
        }

        // ---------- Nayi files jodna ----------
        newStored = await buildAttachments(req, newFiles);
        task.attachments.push(...newStored);

        await task.save();

        // DB save hone ke baad hi purani files (disk / Cloudinary) delete karo
        await deleteStoredFiles(filesToDelete);

        await task.populate("assignedTo", "avatar username fullName");

        // ---------- Notifications ----------
        const newAssignee = task.assignedTo?._id?.toString() || null;

        if (newAssignee && newAssignee !== previousAssignee) {
            const notification = await Notification.create({
                recipient: newAssignee,
                title: "New Task Assigned",
                message: `You have been assigned task "${task.title}".`,
                type: "task",
            });
            getIO().to(newAssignee).emit("new-notification", notification);

        } else if (newAssignee && newAssignee !== req.user._id.toString()) {
            const notification = await Notification.create({
                recipient: newAssignee,
                title: "Task Updated",
                message: `Task "${task.title}" has been updated.`,
                type: "task",
            });
            getIO().to(newAssignee).emit("new-notification", notification);
        }

        // ---------- Real-time update ----------
        await emitToProjectMembers(projectId, "task-updated", task);

        await logActivity({
            project: task.project,
            user: req.user._id,
            action: "TASK_UPDATED",
            entityType: "task",
            entityId: task._id,
            description: `${req.user.username} updated task "${task.title}"`,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, task, "Task updated successfully"));

    } catch (error) {
        // Error aaya to is request me upload hui files bekaar hain, hata do
        cleanupUploadedFiles(newFiles);
        await deleteStoredFiles(newStored);
        throw error;
    }
});

// const deleteTask = asyncHandler(async (req, res) => {

//     const { projectId, taskId } = req.params;

//     const task = await Task.findById(taskId);

//     if (!task) {
//         throw new ApiError(404, "Task not found");
//     }

//     if (task.project.toString() !== projectId) {
//         throw new ApiError(403, "Invalid project");
//     }

//     // Save these before deleting the task
//     const recipientId = task.assignedTo || req.user._id;
//     const taskTitle = task.title;
//     const taskProject = task.project;
//     const deletedTaskId = task._id;

//     // Delete task
//     await Task.findByIdAndDelete(taskId);

//     // Delete subtasks
//     await Subtask.deleteMany({
//         task: taskId,
//     });

//     // Create notification
//     const notification = await Notification.create({

//         recipient: recipientId,

//         title: "Task Deleted",

//         message: `Task "${taskTitle}" has been deleted.`,

//         type: "task",

//     });

//     // Send real-time notification
//     getIO()
//         .to(recipientId.toString())
//         .emit("new-notification", notification);

//     const projectMembers = await ProjectMember.find({
//     project: projectId,
// });

// for (const member of projectMembers) {

//     getIO()
//         .to(member.user.toString())
//         .emit("task-deleted", {
//             taskId: deletedTaskId,
//             projectId: projectId,
//         });

// }

//     // Log activity
//     await logActivity({

//         project: taskProject,

//         user: req.user._id,

//         action: "TASK_DELETED",

//         entityType: "task",

//         entityId: deletedTaskId,

//         description:
//             `${req.user.username} deleted task "${taskTitle}"`,

//     });

//     return res
//         .status(200)
//         .json(
//             new ApiResponse(
//                 200,
//                 {},
//                 "Task deleted successfully"
//             )
//         );
// });

const deleteTask = asyncHandler(async (req, res) => {

    const { projectId, taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    if (task.project.toString() !== projectId) {
        throw new ApiError(403, "Invalid project");
    }


    // ==========================================
    // Save required data before deleting
    // ==========================================

    const recipientId = task.assignedTo;

    const taskTitle = task.title;

    const taskProject = task.project;

    const deletedTaskId = task._id;


    // ==========================================
    // Collect attachment file paths
    // ==========================================

    // Attachments + submissions ki saari files (local ya Cloudinary)
    const filesToDelete = [
        ...(task.attachments || []),
        ...(task.submissions || []).flatMap((submission) => submission.files || []),
    ];

    await deleteStoredFiles(filesToDelete);


    // Delete task


    await Promise.all([
        Task.findByIdAndDelete(taskId),
        Subtask.deleteMany({ task: taskId }),
        Comment.deleteMany({ task: taskId }),
    ]);


    // Create notification


    // Assigned member ko batao (agar delete karne wala khud wo nahi hai)
    if (recipientId && recipientId.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
            recipient: recipientId,
            title: "Task Deleted",
            message: `Task "${taskTitle}" has been deleted.`,
            type: "task",
        });

        getIO()
            .to(recipientId.toString())
            .emit("new-notification", notification);
    }



    // Send real-time task deletion


    await emitToProjectMembers(projectId, "task-deleted", {
        taskId: deletedTaskId,
        projectId: projectId,
    });


    // Log activity


    await logActivity({

        project: taskProject,

        user: req.user._id,

        action: "TASK_DELETED",

        entityType: "task",

        entityId: deletedTaskId,

        description:
            `${req.user.username} deleted task "${taskTitle}"`,

    });


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Task deleted successfully"
            )
        );

});

const submitTask = asyncHandler(async (req, res) => {

    const { taskId, projectId } = req.params;
    const uploadedFiles = req.files || [];
    let storedFiles = [];

    try {
        const task = await findTaskInProject(taskId, projectId);

        if (
            !task.assignedTo ||
            task.assignedTo.toString() !== req.user._id.toString()
        ) {
            throw new ApiError(403, "Only assigned member can submit this task");
        }

        const previousSubmission = task.submissions
            .filter(
                (submission) =>
                    submission.submittedBy.toString() === req.user._id.toString()
            )
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

        if (previousSubmission?.status === "pending") {
            throw new ApiError(400, "Your previous submission is still under review");
        }

        if (previousSubmission?.status === "approved") {
            throw new ApiError(400, "Task already approved");
        }

        if (!uploadedFiles.length) {
            throw new ApiError(400, "Please upload at least one file");
        }

        storedFiles = await buildAttachments(req, uploadedFiles, "task-submissions");

        task.submissions.push({
            submittedBy: req.user._id,
            files: storedFiles.map(({ uploadedBy, ...file }) => file),
            submittedAt: new Date(),
            status: "pending",
        });

        task.status = "in_review";

        await task.save();

        await task.populate([
            { path: "assignedTo", select: "username fullName avatar" },
            { path: "assignedBy", select: "username fullName avatar" },
            { path: "submissions.submittedBy", select: "username fullName avatar" },
            { path: "submissions.reviewedBy", select: "username fullName avatar" },
        ]);

        // Task banane wale (admin) ko real-time update + notification
        const adminId = task.assignedBy?._id;

        if (adminId) {
            getIO().to(adminId.toString()).emit("task-submitted", task);

            const notification = await Notification.create({
                recipient: adminId,
                title: "Task Submitted",
                message: `${req.user.username} submitted "${task.title}".`,
                type: "task",
            });

            getIO().to(adminId.toString()).emit("new-notification", notification);
        }

        await logActivity({
            project: task.project,
            user: req.user._id,
            action: "TASK_SUBMITTED",
            entityType: "task",
            entityId: task._id,
            description: `${req.user.username} submitted task "${task.title}"`,
        });

        return res.status(200).json(
            new ApiResponse(200, task, "Task submitted successfully")
        );
    } catch (error) {
        cleanupUploadedFiles(uploadedFiles);
        await deleteStoredFiles(storedFiles);
        throw error;
    }
});

const reviewTaskSubmission = asyncHandler(async (req, res) => {

    const { taskId, projectId } = req.params;

    const { submissionId, status, feedback } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        throw new ApiError(400, "Status must be approved or rejected");
    }

    const task = await findTaskInProject(taskId, projectId);

    const submission = task.submissions.id(submissionId);

    if (!submission) {
        throw new ApiError(404, "Submission not found");
    }

    if (submission.status !== "pending") {
        throw new ApiError(400, "This submission is already reviewed");
    }

    const submittedBy = submission.submittedBy;

    submission.status = status;
    submission.feedback = feedback || "";
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();

    if (status === "approved") {
        task.status = "completed";
    } else {
        task.status = "in_progress";
    }

    await task.save();
    await task.populate([
    {
        path: "assignedTo",
        select: "username fullName avatar",
    },
    {
        path: "assignedBy",
        select: "username fullName avatar",
    },
    {
        path: "submissions.submittedBy",
        select: "username fullName avatar",
    },
    {
        path: "submissions.reviewedBy",
        select: "username fullName avatar",
    },
]);

// 🔥 Real-time task update for assigned member
getIO()
    .to(submittedBy.toString())
    .emit("task-reviewed", task);



    const notification = await Notification.create({
    recipient: submittedBy,
    title: status === "approved"
        ? "Task Approved"
        : "Task Rejected",
    message:
        status === "approved"
            ? `Your submission for "${task.title}" has been approved.`
            : `Your submission for "${task.title}" has been rejected.`,
    type: "task",
});

getIO()
    .to(submittedBy.toString())
    .emit("new-notification", notification);

    await logActivity({
        project: task.project,
        user: req.user._id,
        action: "TASK_REVIEWED",
        entityType: "task",
        entityId: task._id,
        description:
            status === "approved"
                ? `${req.user.username} approved task "${task.title}"`
                : `${req.user.username} rejected task "${task.title}"`,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            task,
            "Submission reviewed successfully"
        )
    );
});

const createSubTask = asyncHandler(async(req,res)=>{

    const { taskId, projectId } = req.params;

    const {
        title
    }=req.body;

    if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
}

    const task = await findTaskInProject(taskId, projectId);

    if (!canManageChecklist(req, task)) {
        throw new ApiError(403, "Only assigned member can manage personal checklist");
    }

    const subtask = await Subtask.create({

        title: title.trim(),

        task:new mongoose.Types.ObjectId(taskId),

        createdBy:new mongoose.Types.ObjectId(req.user._id)

    });

    await logActivity({
    project: task.project,
    user: req.user._id,
    action: "SUBTASK_CREATED",
    entityType: "subtask",
    entityId: subtask._id,
    description: `${req.user.username} added subtask "${subtask.title}"`,
});

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            subtask,
            "Subtask created successfully"
        )
    );

});

const updateSubTask = asyncHandler(async (req, res) => {
  const { subTaskId, taskId, projectId } = req.params;
  const { isCompleted, title } = req.body;

  const task = await findTaskInProject(taskId, projectId);

  // BUG FIX: pehle subtask null hone par bhi subtask.task padh rahe the (crash),
  // aur unassigned task par task.assignedTo.toString() crash karta tha
  let subtask = await Subtask.findOne({ _id: subTaskId, task: task._id });

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (!canManageChecklist(req, task)) {
    throw new ApiError(403, "Only assigned member can manage personal checklist");
  }

  if (title !== undefined && !title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  subtask = await Subtask.findByIdAndUpdate(
    subTaskId,
    {
      ...(title !== undefined && { title: title.trim() }),
      ...(isCompleted !== undefined && { isCompleted: Boolean(isCompleted) }),
    },
    { new: true,
       runValidators:true
     }
  );

if (title !== undefined) {
    await logActivity({
        project: task.project,
        user: req.user._id,
        action: "SUBTASK_UPDATED",
        entityType: "subtask",
        entityId: subtask._id,
        description: `${req.user.username} updated subtask "${subtask.title}"`,
    });
}

if (isCompleted !== undefined) {

    await logActivity({
        project: task.project,
        user: req.user._id,
        action: "SUBTASK_STATUS_CHANGED",
        entityType: "subtask",
        entityId: subtask._id,
        description: subtask.isCompleted
            ? `${req.user.username} completed subtask "${subtask.title}"`
            : `${req.user.username} marked subtask "${subtask.title}" incomplete`,
    });

}


  return res.status(200).json(
    new ApiResponse(
      200,
      subtask,
      "Subtask updated successfully"
    )
  );
});

const deleteSubTask = asyncHandler(async(req,res)=>{

    const { subTaskId, taskId, projectId } = req.params;

    const task = await findTaskInProject(taskId, projectId);

    const subtask = await Subtask.findOne({ _id: subTaskId, task: task._id });

    if (!subtask) {
    throw new ApiError(404, "Subtask not found");
}

if (
    req.user.role !== UserRolesEnum.ADMIN &&
    subtask.createdBy.toString() !== req.user._id.toString()
) {
    throw new ApiError(
        403,
        "You can delete only your own subtasks"
    );
}

await Subtask.findByIdAndDelete(subTaskId);

await logActivity({
    project: task.project,
    user: req.user._id,
    action: "SUBTASK_DELETED",
    entityType: "subtask",
    entityId: subtask._id,
    description: `${req.user.username} deleted subtask "${subtask.title}"`,
});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Subtask deleted successfully"
        )
    );

});

const getSubTasks = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;

  const task = await findTaskInProject(taskId, projectId);

  const subtasks = await Subtask.find({
    task: task._id,
  })
    .populate("createdBy", "username fullName avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      subtasks,
      "Subtasks fetched successfully"
    )
  );
});

export {
  getMyTasks,
  updateTaskStatus,
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
  getSubTasks,
  submitTask,
  reviewTaskSubmission,
};
