import mongoose from "mongoose";

import { Activity } from "../models/activity.models.js";
import { Project } from "../models/project.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectActivities = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const activities = await Activity.find({
        project: new mongoose.Types.ObjectId(projectId),
    })
        .populate("user", "username fullName avatar")
        .sort({ createdAt: -1 })
        .limit(10);

    return res.status(200).json(
        new ApiResponse(
            200,
            activities,
            "Activities fetched successfully"
        )
    );
});

export {
    getProjectActivities,
};