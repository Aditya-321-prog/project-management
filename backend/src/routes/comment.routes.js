import { Router } from "express";

import {
    getComments,
    createComment,
    deleteComment,
} from "../controllers/comment.controllers.js";

import {
    verifyJWT,
    validateProjectPermission,
} from "../middlewares/auth.middleware.js";

import {
    AvailableUserRole,
} from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router
.route("/:projectId/:taskId")
.get(
    validateProjectPermission(AvailableUserRole),
    getComments
)
.post(
    validateProjectPermission(AvailableUserRole),
    createComment
);

router
.route("/:projectId/:taskId/:commentId")
.delete(
    validateProjectPermission(AvailableUserRole),
    deleteComment
);

export default router;