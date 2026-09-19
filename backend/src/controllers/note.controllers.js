import mongoose from "mongoose";
import { Note } from "../models/note.models.js";
import { Project } from "../models/project.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { Notification } from "../models/notification.models.js";
import { logActivity } from "../utils/logActivity.js";
import { UserRolesEnum } from "../utils/constants.js";

// Note ko sirf banane wala ya project admin edit/delete kar sakta hai
const assertCanModifyNote = (req, note) => {
  const isOwner = note.createdBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === UserRolesEnum.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You can only modify your own notes");
  }
};


const getNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const notes = await Note.find({
    project: new mongoose.Types.ObjectId(projectId),
  })
    .populate("createdBy", "username fullName avatar")
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const { title, content } = req.body;

  // title undefined hone par pehle crash hota tha
  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const note = await Note.create({
    title,
    content,
    project: new mongoose.Types.ObjectId(projectId),
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  await note.populate(
    "createdBy",
    "username fullName avatar"
);

  await Notification.create({

    recipient: req.user._id,

    title: "Note Created",

    message: `Note "${note.title}" has been created.`,

    type: "note",

});

await logActivity({
    project: projectId,
    user: req.user._id,
    action: "NOTE_CREATED",
    entityType: "note",
    entityId: note._id,
    description: `${req.user.username} created note "${note.title}"`,
});

  return res
    .status(201)
    .json(new ApiResponse(201, note, "Note created successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;
  const { title, content } = req.body;

  const note = await Note.findOne({
    _id: noteId,
    project: projectId,
  });

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  assertCanModifyNote(req, note);

  if (title !== undefined && !title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  const updatedNote = await Note.findByIdAndUpdate(
    noteId,
    {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  await Notification.create({
    recipient: req.user._id,
    title: "Note Updated",
    message: `Note "${updatedNote.title}" has been updated.`,
    type: "note",
  });

  await logActivity({
    project: projectId,
    user: req.user._id,
    action: "NOTE_UPDATED",
    entityType: "note",
    entityId: updatedNote._id,
    description: `${req.user.username} updated note "${updatedNote.title}"`,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedNote, "Note updated successfully")
  );
});

const deleteNote = asyncHandler(async (req, res) => {
  // BUG FIX: pehle projectId yahan nikala hi nahi tha ->
  // "projectId is not defined" error, note kabhi delete nahi hota tha
  const { projectId, noteId } = req.params;

  const existing = await Note.findOne({
    _id: noteId,
    project: projectId,
  });

  if (!existing) {
    throw new ApiError(404, "Note not found");
  }

  assertCanModifyNote(req, existing);

  const note = await Note.findByIdAndDelete(existing._id);

  await Notification.create({

    recipient: req.user._id,

    title: "Note Deleted",

    message: `Note "${note.title}" has been deleted.`,

    type: "note",

});


await logActivity({
    project: note.project,
    user: req.user._id,
    action: "NOTE_DELETED",
    entityType: "note",
    entityId: note._id,
    description: `${req.user.username} deleted note "${note.title}"`,
});

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note deleted successfully"));
});

export {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};