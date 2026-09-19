import { Router } from "express";

import { getProjectActivities } from "../controllers/activity.controllers.js";
import {
    verifyJWT,
    validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router.get(
    "/:projectId",
    validateProjectPermission(AvailableUserRole),
    getProjectActivities
);


export default router;