import { Router } from "express";
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markChatRead,
  getUnreadCount,
} from "../controllers/message.controllers.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

// Sirf project ke members hi chat padh / likh sakte hain
const anyMember = validateProjectPermission(AvailableUserRole);

router
  .route("/:projectId")
  .get(anyMember, getMessages)
  .post(anyMember, sendMessage);

router.get("/:projectId/unread", anyMember, getUnreadCount);
router.post("/:projectId/read", anyMember, markChatRead);

router.delete("/:projectId/:messageId", anyMember, deleteMessage);

export default router;
