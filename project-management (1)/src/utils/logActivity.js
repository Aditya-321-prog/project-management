import { Activity } from "../models/activity.models.js";

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

        await Activity.create({
            project,
            user,
            action,
            entityType,
            entityId,
            description: description.trim(),
        });
    } catch (error) {
        console.error("Activity Log Error:", error);
    }
};