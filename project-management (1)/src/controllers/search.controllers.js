import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { ProjectMember } from "../models/projectmember.models.js";

// User ka text seedha regex me daalne se "(" jaise character par
// server crash hota tha - isliye special characters escape karte hain
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const globalSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").toString().trim().slice(0, 100);

  if (!q) {
    return res.status(200).json(
      new ApiResponse(200, {
        projects: [],
        tasks: [],
      })
    );
  }

  const regex = new RegExp(escapeRegex(q), "i");

  // SECURITY FIX: pehle search poori app ke SAB projects / tasks me hota tha -
  // koi bhi user dusron ke private projects ke naam dekh sakta tha.
  // Ab sirf wahi projects jinke tum member ho.
  const projectIds = await ProjectMember.find({ user: req.user._id }).distinct(
    "project",
  );

  const [projects, tasks] = await Promise.all([
    Project.find({ _id: { $in: projectIds }, name: regex })
      .select("name description")
      .limit(5)
      .lean(),
    Task.find({ project: { $in: projectIds }, title: regex })
      .populate("project", "name")
      .select("title status project")
      .limit(5)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        tasks,
      },
      "Search successful"
    )
  );
});

export { globalSearch };
