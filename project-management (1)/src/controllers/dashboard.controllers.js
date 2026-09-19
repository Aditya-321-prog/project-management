import { Task } from "../models/task.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { TaskStatusEnum } from "../utils/constants.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getDashboardStats = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    // User ke saare projects ki ids
    const memberships = await ProjectMember.find({ user: userId })
        .select("project")
        .lean();

    const projectIds = memberships.map((m) => m.project);

    // Saari queries ek saath chalti hain (pehle ek ke baad ek chalti thi)
    const [
        tasks,
        completedTasks,
        teammateIds,
        recentProjects,
        recentTasks,
    ] = await Promise.all([
        Task.countDocuments({ assignedTo: userId }),

        // BUG FIX: pehle TaskStatusEnum.DONE use ho raha tha jo exist hi
        // nahi karta (sahi naam COMPLETED hai). Isliye "Completed" aur
        // "Pending" dono me saare tasks gine jaate the.
        Task.countDocuments({
            assignedTo: userId,
            status: TaskStatusEnum.COMPLETED,
        }),

        // Pehle "members" = projects ka count hi tha. Ab asli teammates:
        // tumhare projects ke unique log (tumhe chhod kar)
        ProjectMember.distinct("user", {
            project: { $in: projectIds },
            user: { $ne: userId },
        }),

        ProjectMember.aggregate([
            { $match: { user: userId } },
            {
                $lookup: {
                    from: "projects",
                    localField: "project",
                    foreignField: "_id",
                    as: "project",
                },
            },
            { $unwind: "$project" },
            { $replaceRoot: { newRoot: "$project" } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
        ]),

        Task.find({ assignedTo: userId })
            .select("title status priority dueDate project createdAt")
            .populate("project", "_id name")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                projects: projectIds.length,
                tasks,
                completedTasks,
                pendingTasks: tasks - completedTasks,
                members: teammateIds.length,
                recentProjects,
                recentTasks,
            },
            "Dashboard fetched successfully"
        )
    );
});

export {
    getDashboardStats,
};
