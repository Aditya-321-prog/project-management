import mongoose from "mongoose";
import { Activity } from "../models/activity.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// Feed ke filter tabs -> kaunse entity types
const TYPE_FILTERS = {
    tasks: ["task"],
    members: ["member"],
    notes: ["note"],
    comments: ["comment"],
    project: ["project"],
};

// ==========================================
// GET /activities/:projectId?before=<id>&limit=20&type=tasks
// - Purani activity thodi-thodi karke ("Load more")
// - Checklist (subtask) activity sirf usi ko dikhti hai jisne ki
// ==========================================
const getProjectActivities = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { before, type } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const query = {
        project: new mongoose.Types.ObjectId(projectId),
        $or: [
            { action: { $not: /^SUBTASK_/ } },
            { user: req.user._id },
        ],
    };

    if (type && type !== "all") {
        if (!TYPE_FILTERS[type]) {
            throw new ApiError(400, "Invalid activity type");
        }
        query.entityType = { $in: TYPE_FILTERS[type] };
    }

    if (before) {
        if (!mongoose.isValidObjectId(before)) {
            throw new ApiError(400, "Invalid cursor");
        }
        query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const activities = await Activity.find(query)
        .populate("user", "username fullName avatar")
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = activities.length > limit;
    if (hasMore) activities.pop();

    return res.status(200).json(
        new ApiResponse(
            200,
            { activities, hasMore },
            "Activities fetched successfully"
        )
    );
});

export {
    getProjectActivities,
};
