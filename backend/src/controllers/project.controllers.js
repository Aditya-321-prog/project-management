import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { Notification } from "../models/notification.models.js";
import { logActivity } from "../utils/logActivity.js";
import { getIO } from "../socket/socket.js";
import fs from "fs/promises";

import { Activity } from "../models/activity.models.js";
import { Comment } from "../models/comment.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { Note } from "../models/note.models.js";
import { Message } from "../models/message.models.js";
import { deleteStoredFiles } from "../utils/storage.js";

// Kai logon ko ek saath notification bhejna: 1 DB call (insertMany) + socket emit
const notifyUsers = async (userIds, { title, message, type }) => {
  if (!userIds.length) return;

  const notifications = await Notification.insertMany(
    userIds.map((recipient) => ({ recipient, title, message, type })),
  );

  for (const notification of notifications) {
    getIO()
      .to(notification.recipient.toString())
      .emit("new-notification", notification);
  }
};

const countAdmins = (projectId) =>
  ProjectMember.countDocuments({
    project: projectId,
    role: UserRolesEnum.ADMIN,
  });


const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
  // Step 1: Current user ke ProjectMember documents lo
  {
    $match: {
      user: new mongoose.Types.ObjectId(req.user._id),
    },
  },

  // Step 2: Project details join karo (simple $lookup)
  {
    $lookup: {
      from: "projects",
      localField: "project",
      foreignField: "_id",
      as: "project",
    },
  },

  // Step 3: $lookup array se single object banao
  {
    $unwind: "$project",
  },

  // Step 4: Is project ke saare members lao (dusra simple $lookup)
  {
    $lookup: {
      from: "projectmembers",
      localField: "project._id",   // project ka _id
      foreignField: "project",     // projectmembers me project field
      as: "projectmembers",
    },
  },

  // Step 5: Members count add karo
  {
    $addFields: {
      "project.members": { $size: "$projectmembers" },
    },
  },

  // Step 6: Final output shape
  {
    $project: {
      project: {
        _id: 1,
        name: 1,
        description: 1,
        members: 1,
        createdAt: 1,
        createdBy: 1,
      },
      role: 1,
      _id: 0,
    },
  },
]);


/// ismei let/ pipline yani ki correlated subquery bhi use kr sakte hai agr efficiency chahiye to 
// ismei jyada lookups lag rhe hai aur no of members ke liye alag se group by use krke bhi kr skte hai lekin 
// uske liye phirr nikalke ismei join krna pdega final object mei 
// ye tab kr sakte hai jab mujhe no of members bhot baar nikalne ho ya projectmemberships bhot jyada bad jayee

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMember = await ProjectMember.findOne({
    project: project._id,
    user: req.user._id,
  });

  if (!projectMember) {
    throw new ApiError(403, "You are not a member of this project");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project,
        currentUserRole: projectMember.role,
      },
      "Project fetched successfully"
    )
  );
});

const createProject = asyncHandler(async (req, res) => {

    const { name, description } = req.body;

    // Pehle project ka naam poori app me unique tha - agar kisi aur user ne
    // "Website" naam ka project bana liya to tum nahi bana sakte the.
    // Ab sirf tumhare apne projects me naam repeat nahi hoga.
    const existingProject = await Project.findOne({
        name: name.trim(),
        createdBy: req.user._id,
    });

    if (existingProject) {
        throw new ApiError(
            400,
            "You already have a project with this name"
        );
    }

    const project = await Project.create({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });


    await logActivity({
        project: project._id,
        user: req.user._id,
        action: "PROJECT_CREATED",
        entityType: "project",
        entityId: project._id,
        description:
            `${req.user.username} created project "${project.name}"`,
    });


    await ProjectMember.create({
        user: new mongoose.Types.ObjectId(req.user._id),
        project: new mongoose.Types.ObjectId(project._id),
        role: UserRolesEnum.ADMIN,
    });


    // 🔥 Real-time project creation
    getIO()
    .to(req.user._id.toString())
    .emit("project-created", project);


    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                project,
                "Project created Successfully"
            )
        );
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      name,
      description,
    },
    {
      new: true,    // { returnDocument: "after" } bhi use kr sakte hai ek hi bat hai ek mongoose hai aur doosra mongodb khud
      runValidators: true,
    }
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.find({
    project: projectId,
  }).lean();

  // Update karne wale ko khud notification nahi chahiye
  const otherMembers = projectMembers
    .map((m) => m.user)
    .filter((id) => id.toString() !== req.user._id.toString());

  await notifyUsers(otherMembers, {
    title: "Project Updated",
    message: `Project "${project.name}" has been updated.`,
    type: "project",
  });

  for (const member of projectMembers) {
    getIO()
      .to(member.user.toString())
      .emit("project-updated", project);
  }

  

  

  await logActivity({
    project: project._id,
    user: req.user._id,
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: project._id,
    description: `${req.user.username} updated project "${project.name}"`,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        project,
        "Project updated successfully"
      )
    );
});

// const deleteProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;

//   const project = await Project.findById(projectId);

//   if (!project) {
//     throw new ApiError(404, "Project not found");
//   }

//   const projectMembers = await ProjectMember.find({
//     project: projectId,
// });

//   await Project.findByIdAndDelete(projectId);

//   for (const member of projectMembers) {
//     const notification = await Notification.create({
//       recipient: member.user,
//       title: "Project Deleted",
//       message: `Project "${project.name}" has been deleted.`,
//       type: "project",
//     });

//     getIO()
//       .to(member.user.toString())
//       .emit("new-notification", notification);
    
//     getIO()
//         .to(member.user.toString())
//         .emit("project-deleted", {
//             projectId,
//         });
//   }

//   await ProjectMember.deleteMany({
//     project: projectId,
//   });


//   await logActivity({
//     project: project._id,
//     user: req.user._id,
//     action: "PROJECT_DELETED",
//     entityType: "project",
//     entityId: project._id,
//     description: `${req.user.username} deleted project "${project.name}"`,
//   });

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         {},
//         "Project deleted successfully"
//       )
//     );
// });


const deleteProject = asyncHandler(async (req, res) => {

    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(
            404,
            "Project not found"
        );
    }



    // Get all project members


    const projectMembers = await ProjectMember.find({
        project: projectId,
    });


  
    // Get all tasks of this project


    const tasks = await Task.find({
        project: projectId,
    });



    // Saari task files (attachments + submissions) - local ya Cloudinary
    await deleteStoredFiles(
        tasks.flatMap((task) => [
            ...(task.attachments || []),
            ...(task.submissions || []).flatMap((submission) => submission.files || []),
        ]),
    );



    // Delete task related data


    const taskIds = tasks.map(
        (task) => task._id
    );


    if (taskIds.length > 0) {

        await Subtask.deleteMany({
            task: {
                $in: taskIds,
            },
        });


        await Comment.deleteMany({
            task: {
                $in: taskIds,
            },
        });


        await Task.deleteMany({
            _id: {
                $in: taskIds,
            },
        });

    }



    // Delete project related data


    // Notes pehle delete nahi hote the - DB me bekaar pade rehte the
    await Promise.all([
        ProjectMember.deleteMany({ project: projectId }),
        Comment.deleteMany({ project: projectId }),
        Activity.deleteMany({ project: projectId }),
        Note.deleteMany({ project: projectId }),
        Message.deleteMany({ project: projectId }),
    ]);



    // Delete project
  

    await Project.findByIdAndDelete(
        projectId
    );

    // Notify project members
   

    await notifyUsers(
        projectMembers
            .map((m) => m.user)
            .filter((id) => id.toString() !== req.user._id.toString()),
        {
            title: "Project Deleted",
            message: `Project "${project.name}" has been deleted.`,
            type: "project",
        },
    );

    for (const member of projectMembers) {

        getIO()
            .to(member.user.toString())
            .emit(
                "project-deleted",
                {
                    projectId,
                }
            );

    }


    /*
      yhn activity log nhi kr rhe kyunki hamne is project ki saari activity hata di hai phle h db se
    */


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Project and all related data deleted successfully"
            )
        );

});


const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

if (!project) {
    throw new ApiError(404, "Project not found");
}
  const member = await User.findOne({ email: email.trim().toLowerCase() });

  if (!member) {
    throw new ApiError(404, "User does not exists");
  }

const existingMember = await ProjectMember.findOne({
    user: member._id,
    project: projectId,
});

if (existingMember) {
    throw new ApiError(400, "User is already a member of this project");
}

const projectMember = await ProjectMember.create({
    user: member._id,
    project: projectId,
    role,
});

await projectMember.populate(
    "user",
    "username fullName avatar email"
);

  const notification = await Notification.create({
  recipient: member._id,
  title: "Added to Project",
  message: `You have been added to project "${project.name}".`,
  type: "member",
});

getIO()
  .to(member._id.toString())
  .emit("new-notification", notification);

getIO()
    .to(`project:${projectId}`)
    .emit("member-added", projectMember);

  await logActivity({
    project: projectId,
    user: req.user._id,
    action: "MEMBER_ADDED",
    entityType: "member",
    entityId: member._id,
    description: `${req.user.username} added ${member.username} to the project`,
  });

  

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Project member added successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.aggregate([
  {
    $match: {
      project: new mongoose.Types.ObjectId(projectId),
    },
  },

  // Simple $lookup: users collection se user document chahiye
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user",
    },
  },

  // user array ko object me convert krna hai (kyunki $lookup array deta hai)
  {
    $addFields: {
      user: { $arrayElemAt: ["$user", 0] },
    },
  },


  {
    $project: {
      project: 1,
      role: 1,
      createdAt: 1,
      updatedAt: 1,
      "user._id": 1,
      "user.username": 1,
      "user.fullName": 1,
      "user.avatar": 1,
      "user.email": 1,
      _id: 0,
    },
  },
]);

  return res
    .status(200)
    .json(new ApiResponse(200, projectMembers, "Project members fetched"));
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { newRole } = req.body;

  if (!AvailableUserRole.includes(newRole)) {
    throw new ApiError(400, "Invalid Role");
  }

  const project = await Project.findById(projectId);

if (!project) {
  throw new ApiError(404, "Project not found");
}

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  // Aakhri admin ko member bana diya to project ka koi admin nahi bachta
  if (
    projectMember.role === UserRolesEnum.ADMIN &&
    newRole !== UserRolesEnum.ADMIN &&
    (await countAdmins(projectId)) <= 1
  ) {
    throw new ApiError(400, "A project must have at least one admin");
  }

  const memberUser = await User.findById(userId);

  if (!memberUser) {
    throw new ApiError(404, "User not found");
}
  projectMember = await ProjectMember.findByIdAndUpdate(
    projectMember._id,
    {
        role: newRole,
    },
    {
        new: true,
        runValidators: true,
    },
);

const notification = await Notification.create({
  recipient: memberUser._id,
  title: "Project Role Updated",
  message: `Your role in project "${project.name}" has been changed to "${newRole}".`,
  type: "member",
});

getIO()
  .to(memberUser._id.toString())
  .emit("new-notification", notification);

getIO()
    .to(`project:${projectId}`)
    .emit("member-role-updated", {
        userId: memberUser._id,
        role: newRole,
    });

  await logActivity({
  project: projectId,
  user: req.user._id,
  action: "ROLE_UPDATED",
  entityType: "member",
  entityId: userId,
  description: `${req.user.username} changed ${memberUser.username}'s role to ${newRole}`,
});

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member role updated successfully",
      ),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  // BUG FIX: pehle project fetch wali lines comment thi, lekin neeche
  // project.name use ho raha tha -> har baar "project is not defined" error
  // aata tha aur member kabhi remove hi nahi hota tha
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMember = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  }).populate("user", "username");

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  if (
    projectMember.role === UserRolesEnum.ADMIN &&
    (await countAdmins(projectId)) <= 1
  ) {
    throw new ApiError(400, "You cannot remove the only admin of the project");
  }

  await ProjectMember.findByIdAndDelete(projectMember._id);

  // Us member ko assign kiye gaye tasks ab "Unassigned" ho jaayenge
  await Task.updateMany(
    { project: projectId, assignedTo: projectMember.user._id },
    { $set: { assignedTo: null } },
  );

  await notifyUsers([projectMember.user._id], {
    title: "Removed from Project",
    message: `You have been removed from project "${project.name}".`,
    type: "member",
  });

  getIO()
    .to(projectMember.user._id.toString())
    .emit("project-deleted", { projectId });

  // Nikaale gaye member ke khule tabs ko project room (chat, live updates)
  // se bhi bahar karo
  getIO().in(projectMember.user._id.toString()).socketsLeave(`project:${projectId}`);

  getIO()
    .to(`project:${projectId}`)
    .emit("member-removed", {
      userId,
    });

  await logActivity({
    project: projectId,
    user: req.user._id,
    action: "MEMBER_REMOVED",
    entityType: "member",
    entityId: userId,
    description: `${req.user.username} removed ${projectMember.user.username} from the project`,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { userId },
        "Project member deleted successfully"
      )
    );
});

export {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  updateMemberRole,
};
