import { ProjectMember } from "../models/projectmember.models.js";
import mongoose from "mongoose";

import { Comment } from "../models/comment.models.js";
import { Task } from "../models/task.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

import { Notification } from "../models/notification.models.js";
import { logActivity } from "../utils/logActivity.js";
import { getIO } from "../socket/socket.js";

const emitToProjectMembersExcept = async (projectId, exceptUserId, event, payload) => {
    const members = await ProjectMember.find({ project: projectId }).select("user").lean();
    for (const member of members) {
        if (member.user.toString() !== exceptUserId.toString()) {
            getIO().to(member.user.toString()).emit(event, payload);
        }
    }
};

// Task isi project ka hona chahiye (pehle kisi bhi project ke task par
// comment / delete ho sakta tha)
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

const getComments = asyncHandler(async (req, res) => {

    const { taskId, projectId } = req.params;

    await findTaskInProject(taskId, projectId);

    const comments = await Comment.find({

        task: new mongoose.Types.ObjectId(taskId),

    })
        .populate(
            "user",
            "username fullName avatar"
        )
        .sort({ createdAt: 1 })
        .lean();

    return res.status(200).json(

        new ApiResponse(

            200,

            comments,

            "Comments fetched successfully"

        )

    );

});

const createComment = asyncHandler(async (req, res) => {

    const { projectId, taskId } = req.params;

    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Comment is required");
    }

    const task = await findTaskInProject(taskId, projectId);

    // ==========================================
    // Create Comment
    // ==========================================

    const comment = await Comment.create({

        project: projectId,

        task: taskId,

        user: req.user._id,

        content: content.trim(),

    });

    // Populate comment user
    await comment.populate(
        "user",
        "username fullName avatar"
    );


    // ==========================================
    // Find Recipient
    // ==========================================

    let recipientId = null;

    // If current user is assigned member
    // → send to admin

    if (
        task.assignedTo &&
        task.assignedTo.toString() ===
            req.user._id.toString()
    ) {

        recipientId = task.assignedBy;

    }

    // If current user is admin
    // → send to assigned member

    else if (
        task.assignedBy &&
        task.assignedBy.toString() ===
            req.user._id.toString()
    ) {

        recipientId = task.assignedTo;

    }

    // Real-time Comment Update - project ke sab members ko (likhne wale ko chhod kar).
    // Pehle sirf admin <-> assignee ko jaata tha, baaki members ko refresh karna padta tha
    await emitToProjectMembersExcept(projectId, req.user._id, "comment-created", {
        ...comment.toObject(),
        task: taskId,
    });



    // Notification

    if (recipientId) {

        const notification = await Notification.create({

            recipient: recipientId,

            title: "New Comment",

            message:
                `${req.user.username} commented on "${task.title}".`,

            type: "task",

        });


        getIO()
            .to(recipientId.toString())
            .emit(
                "new-notification",
                notification
            );

    }


    // ==========================================
    // Activity Log
    // ==========================================

    await logActivity({

        project: task.project,

        user: req.user._id,

        action: "COMMENT_CREATED",

        entityType: "comment",

        entityId: comment._id,

        description:
            `${req.user.username} commented on task "${task.title}"`,

    });


    // ==========================================
    // Response
    // ==========================================

    return res.status(201).json(

        new ApiResponse(

            201,

            comment,

            "Comment added successfully"

        )

    );

});


const deleteComment = asyncHandler(async (req, res) => {

    const { commentId, taskId, projectId } = req.params;

    await findTaskInProject(taskId, projectId);


    // ==========================================
    // Find Comment
    // ==========================================

    const comment =
        await Comment.findOne({ _id: commentId, task: taskId });

    if (!comment) {

        throw new ApiError(
            404,
            "Comment not found"
        );

    }


    // ==========================================
    // Permission Check
    // ==========================================

    const isOwner =
        comment.user.toString() ===
        req.user._id.toString();

    const isAdmin =
        req.user.role === "admin";

    if (!isOwner && !isAdmin) {

        throw new ApiError(
            403,
            "You cannot delete this comment"
        );

    }


    // ==========================================
    // Get Task
    // ==========================================

    const task =
        await Task.findById(comment.task);

    if (!task) {

        throw new ApiError(
            404,
            "Task not found"
        );

    }


    // ==========================================
    // Find Opposite User
    // ==========================================

    let recipientId = null;

    // If assigned member deletes comment
    // → notify admin

    if (
        task.assignedTo &&
        task.assignedTo.toString() ===
            req.user._id.toString()
    ) {

        recipientId = task.assignedBy;

    }

    // If admin deletes comment
    // → notify assigned member

    else if (
        task.assignedBy &&
        task.assignedBy.toString() ===
            req.user._id.toString()
    ) {

        recipientId = task.assignedTo;

    }


    // ==========================================
    // Delete Comment
    // ==========================================

    await Comment.findByIdAndDelete(commentId);


    // ==========================================
    // Real-time Delete
    // ==========================================

    await emitToProjectMembersExcept(projectId, req.user._id, "comment-deleted", {
        commentId: commentId,
        taskId: comment.task.toString(),
    });


    // ==========================================
    // Activity Log
    // ==========================================

    await logActivity({

        project: task.project,

        user: req.user._id,

        action: "COMMENT_DELETED",

        entityType: "comment",

        entityId: commentId,

        description:
            `${req.user.username} deleted a comment on task "${task.title}"`,

    });


    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json(

        new ApiResponse(

            200,

            {},

            "Comment deleted successfully"

        )

    );

});


export {
    getComments,
    createComment,
    deleteComment,
};