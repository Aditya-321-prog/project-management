import { Activity } from "../models/activity.models.js";
import { getIO } from "../socket/socket.js";

// Checklist (subtask) personal hota hai - uski activity sirf karne wale ko dikhti hai
export const isPrivateAction = (action = "") => action.startsWith("SUBTASK_");

export const logActivity = async ({
    project,
    user,
    action,
    entityType,
    entityId,
    description,
}) => {
    try {
        if (
            !project ||
            !user ||
            !action ||
            !entityType ||
            !entityId ||
            !description
        ) {
            return;
        }

        const activity = await Activity.create({
            project,
            user,
            action,
            entityType,
            entityId,
            description: description.trim(),
        });

        // Activity feed live update ho (page refresh ki zaroorat nahi)
        try {
            await activity.populate("user", "username fullName avatar");
            const room = isPrivateAction(action)
                ? user.toString()
                : `project:${project.toString()}`;
            getIO().to(room).emit("activity-created", activity);
        } catch {
            // socket na ho (script / test) to koi baat nahi
        }
    } catch (error) {
        console.error("Activity Log Error:", error);
    }
};
