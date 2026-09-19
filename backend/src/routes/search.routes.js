import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { globalSearch } from "../controllers/search.controllers.js";

const router = Router();

router.use(verifyJWT);

router.get("/", globalSearch);

export default router;