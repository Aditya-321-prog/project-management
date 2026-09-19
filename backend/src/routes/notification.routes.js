import { Router } from "express";

import {
    getNotifications,
    markAsRead,
    markAllAsRead,
} from "../controllers/notification.controllers.js";

import {
    verifyJWT,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router
.route("/")
.get(getNotifications);

router
.route("/read-all")
.put(markAllAsRead);

router
.route("/:notificationId/read")
.put(markAsRead);

export default router;