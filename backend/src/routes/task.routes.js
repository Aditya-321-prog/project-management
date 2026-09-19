import { Router } from "express";

import {
    getMyTasks,
    updateTaskStatus,
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    getSubTasks,
    submitTask,
    reviewTaskSubmission,
} from "../controllers/task.controllers.js";
import {
    verifyJWT,
    validateProjectPermission,
} from "../middlewares/auth.middleware.js";


import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { upload } from "../middlewares/multer.middleware.js";
import { setUploadFolder } from "../middlewares/uploadFolder.middleware.js";

const router = Router();


router.use(verifyJWT);


// My Tasks (saare projects) - "/:projectId" se PEHLE hona zaroori hai,
// warna "my" ko projectId samajh liya jaata
router.get("/my", getMyTasks);

// /projects/:projectId/tasks


router
.route("/:projectId")
.get(
    validateProjectPermission(AvailableUserRole),
    getTasks
)
.post(
    validateProjectPermission([
        UserRolesEnum.ADMIN,
    ]),
    setUploadFolder("task-attachments"),
    upload.array("attachments", 10),
    createTask
);


// single task

router
.route("/:projectId/:taskId")
.get(
    validateProjectPermission(AvailableUserRole),
    getTaskById
)
.put(
    validateProjectPermission([
        UserRolesEnum.ADMIN,
    ]),
    setUploadFolder("task-attachments"),
    upload.array("attachments", 10),
    updateTask
)
.delete(
    validateProjectPermission([
        UserRolesEnum.ADMIN,
    ]),
    deleteTask
);
// Kanban drag & drop - permission controller me check hoti hai
router.patch(
    "/:projectId/:taskId/status",
    validateProjectPermission(AvailableUserRole),
    updateTaskStatus
);

router.post(
    "/:projectId/:taskId/submit",
    validateProjectPermission([
        UserRolesEnum.ADMIN,
        UserRolesEnum.MEMBER,
    ]),
    setUploadFolder("task-submissions"),
    upload.array("files", 10),
    submitTask
);

router.patch(
    "/:projectId/:taskId/review",
    validateProjectPermission([
        UserRolesEnum.ADMIN,
    ]),
    reviewTaskSubmission
);
// subtasks



router
.route("/:projectId/:taskId/subtasks/:subTaskId")
.put(
    validateProjectPermission([
        UserRolesEnum.ADMIN,
        UserRolesEnum.MEMBER,
    ]),
    updateSubTask
)
.delete(
    validateProjectPermission([
        UserRolesEnum.ADMIN,
        UserRolesEnum.MEMBER,
    ]),
    deleteSubTask
)
router
  .route("/:projectId/:taskId/subtasks")
  .get(
    validateProjectPermission(AvailableUserRole),
    getSubTasks
  )
  .post(
    validateProjectPermission(AvailableUserRole),
    createSubTask
)


export default router;