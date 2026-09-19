import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";

let io = null;

// Cookie header se ek cookie nikalna (cookie-parser socket par nahi chalta)
const getCookie = (cookieHeader = "", name) => {
    const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const initializeSocket = (socketIo) => {

    io = socketIo;

    // ==========================================
    // Socket authentication
    // Pehle koi bhi kisi bhi userId ka room join karke
    // uski notifications sun sakta tha. Ab login cookie verify hoti hai.
    // ==========================================
    io.use((socket, next) => {
        try {
            const token =
                getCookie(socket.handshake.headers.cookie, "accessToken") ||
                socket.handshake.auth?.token;

            if (!token) {
                return next(new Error("Unauthorized"));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.userId = decoded._id.toString();
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {

        // Apne room me automatically join - reconnect hone par bhi
        // (pehle server restart ke baad notifications band ho jaati thi)
        socket.join(socket.userId);

        // Purana frontend "join" bhejta hai - sirf apna hi room allowed
        socket.on("join", (userId) => {
            if (userId?.toString() === socket.userId) {
                socket.join(socket.userId);
            }
        });

        socket.on("join-project", async (projectId) => {
            try {
                if (!mongoose.isValidObjectId(projectId)) return;

                const isMember = await ProjectMember.exists({
                    project: projectId,
                    user: socket.userId,
                });

                if (isMember) {
                    socket.join(`project:${projectId}`);
                }
            } catch (error) {
                console.error("join-project error:", error.message);
            }
        });

        socket.on("leave-project", (projectId) => {
            socket.leave(`project:${projectId}`);
        });

    });

};

const getIO = () => {

    if (!io) {
        throw new Error(
            "Socket.io has not been initialized"
        );
    }

    return io;

};

export {
    initializeSocket,
    getIO,
};
