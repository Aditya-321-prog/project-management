import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { runRemindersNow } from "../controllers/reminder.controllers.js";

const router = Router();

router.post("/run", verifyJWT, runRemindersNow);

export default router;
