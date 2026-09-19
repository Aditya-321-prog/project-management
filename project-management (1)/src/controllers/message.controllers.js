import mongoose from "mongoose";
import { Message } from "../models/message.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";
import { getIO } from "../socket/socket.js";

const SENDER_FIELDS = "username fullName avatar";
const MAX_LENGTH = 2000;

// ==========================================
// GET /messages/:projectId?before=<messageId>&limit=30
// Purane messages thode-thode karke (upar scroll par aur load hote hain)
// ==========================================
const getMessages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { before } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

  const query = { project: projectId };

  if (before) {
    if (!mongoose.isValidObjectId(before)) {
      throw new ApiError(400, "Invalid cursor");
    }
    // ObjectId time ke hisaab se badhta hai - isse chhote = purane messages
    query._id = { $lt: before };
  }

  // Ek extra laate hain taaki pata chale aur messages bache hain ya nahi
  const messages = await Message.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("sender", SENDER_FIELDS)
    .lean();

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        // Screen par purane upar, naye neeche
        messages: messages.reverse(),
        hasMore,
      },
      "Messages fetched",
    ),
  );
});

// ==========================================
// POST /messages/:projectId   { text }
// ==========================================
const sendMessage = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const text = req.body.text?.toString().trim();

  if (!text) {
    throw new ApiError(400, "Message cannot be empty");
  }

  if (text.length > MAX_LENGTH) {
    throw new ApiError(400, `Message is too long (max ${MAX_LENGTH} characters)`);
  }

  const message = await Message.create({
    project: projectId,
    sender: req.user._id,
    text,
  });

  await message.populate("sender", SENDER_FIELDS);

  // Bhejne wale ne toh padh hi liya
  await ProjectMember.updateOne(
    { project: projectId, user: req.user._id },
    { $set: { chatLastReadAt: message.createdAt } },
  );

  // Project room me jitne log project page par hain, sabko turant
  getIO().to(`project:${projectId}`).emit("chat-message", message);

  return res.status(201).json(new ApiResponse(201, message, "Message sent"));
});

// ==========================================
// DELETE /messages/:projectId/:messageId
// Apna message ya admin koi bhi message delete kar sakta hai
// ==========================================
const deleteMessage = asyncHandler(async (req, res) => {
  const { projectId, messageId } = req.params;

  const message = await Message.findOne({ _id: messageId, project: projectId });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const isOwner = message.sender.toString() === req.user._id.toString();
  const isAdmin = req.user.role === UserRolesEnum.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  await message.deleteOne();

  getIO()
    .to(`project:${projectId}`)
    .emit("chat-message-deleted", { projectId, messageId });

  return res.status(200).json(new ApiResponse(200, { messageId }, "Message deleted"));
});

// ==========================================
// POST /messages/:projectId/read  -> chat khola, sab padh liya
// GET  /messages/:projectId/unread -> kitne naye messages hain
// ==========================================
const markChatRead = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await ProjectMember.updateOne(
    { project: projectId, user: req.user._id },
    { $set: { chatLastReadAt: new Date() } },
  );

  return res.status(200).json(new ApiResponse(200, {}, "Marked as read"));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const membership = await ProjectMember.findOne({
    project: projectId,
    user: req.user._id,
  })
    .select("chatLastReadAt")
    .lean();

  const count = await Message.countDocuments({
    project: projectId,
    sender: { $ne: req.user._id },
    ...(membership?.chatLastReadAt && {
      createdAt: { $gt: membership.chatLastReadAt },
    }),
  });

  return res.status(200).json(new ApiResponse(200, { count }, "Unread count"));
});

export { getMessages, sendMessage, deleteMessage, markChatRead, getUnreadCount };
