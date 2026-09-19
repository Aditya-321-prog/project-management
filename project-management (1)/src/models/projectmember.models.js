import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRolesEnum.MEMBER,
    },
  },
  { timestamps: true },
);

// Har permission check isi query se hota hai: { project, user }
projectMemberSchema.index({ project: 1, user: 1 });
projectMemberSchema.index({ user: 1 });

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
