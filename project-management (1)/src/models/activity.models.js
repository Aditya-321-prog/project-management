import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
  type: String,
  enum: [
    "PROJECT_CREATED",
    "PROJECT_UPDATED",
    "PROJECT_DELETED",

    "MEMBER_ADDED",
    "MEMBER_REMOVED",
    "ROLE_UPDATED",

    "TASK_CREATED",
    "TASK_UPDATED",
    "TASK_DELETED",
    "TASK_SUBMITTED",
    "TASK_REVIEWED",
    "TASK_STATUS_CHANGED",

    "NOTE_CREATED",
    "NOTE_UPDATED",
    "NOTE_DELETED",

    "COMMENT_CREATED",
    // Ye actions controllers me use ho rahe the lekin list me nahi the,
    // isliye inki activity kabhi save hi nahi hoti thi (chup-chaap fail)
    "COMMENT_DELETED",
    "SUBTASK_CREATED",
    "SUBTASK_UPDATED",
    "SUBTASK_DELETED",
    "SUBTASK_STATUS_CHANGED",
  ],
  required: true,
},

    entityType: {
      type: String,
      enum: [
      "project",
      "member",
      "task",
      "subtask",
      "note",
      "comment"
      ],
      required: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({
    project: 1,
    createdAt: -1,
});

export const Activity = mongoose.model(
  "Activity",
  activitySchema
);