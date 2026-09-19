import { Router } from "express";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/note.controllers.js";

import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";

import {
  AvailableUserRole,
  UserRolesEnum,
} from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

// /projects/:projectId/notes

router
  .route("/:projectId")
  .get(
    validateProjectPermission(AvailableUserRole),
    getNotes
  )
  .post(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.MEMBER,
    ]),
    createNote
  );

// /projects/:projectId/notes/:noteId

router
  .route("/:projectId/:noteId")
  .put(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.MEMBER,
    ]),
    updateNote
  )
  .delete(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.MEMBER,
    ]),
    deleteNote
  );

export default router;