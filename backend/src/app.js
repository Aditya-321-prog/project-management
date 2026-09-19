import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { allowedOrigins } from "./utils/config.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();

// Render / Vercel proxy ke peeche - asli protocol (https) aur IP pehchaan sake
app.set("trust proxy", 1);

// cors configurations
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    // Download ki file ka naam frontend padh sake
    exposedHeaders: ["Content-Disposition"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


// basic configurations
// 16kb bahut kam tha - lambe notes / descriptions save hi nahi hote the
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// Uploaded files ke naam unique hote hain (timestamp-name), isliye browser
// unhe cache kar sakta hai -> baar baar download nahi hoti
app.use(express.static("public", { maxAge: "7d" }));
app.use(cookieParser());



//  import the routes

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import noteRoutes from "./routes/note.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import searchRoutes from "./routes/search.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import commentRouter from "./routes/comment.routes.js";
import messageRouter from "./routes/message.routes.js";
import reminderRouter from "./routes/reminder.routes.js";


app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/dashboard",dashboardRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/notifications",notificationRoutes);
app.use("/api/v1/activities", activityRoutes);
app.use("/api/v1/comments",commentRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/reminders", reminderRouter);


app.get("/", (req, res) => {
  res.send("Welcome to the project");
});

// 404 + global error handler (hamesha sabse last me)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
