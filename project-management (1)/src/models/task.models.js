import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatues, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatues,
      default: TaskStatusEnum.TODO,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    dueDate: {
      type: Date,
    },
    attachments: {
  type: [
    {
      filename: {
        type: String,
        required: true,
      },

      url: {
        type: String,
        required: true,
      },

      localPath: {
        type: String,
        required: true,
      },

      mimetype: {
        type: String,
      },

      size: {
        type: Number,
      },

      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  default: [],
},
links: {
  type: [
    {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      url: {
        type: String,
        required: true,
        trim: true,
      },
      addedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  default: [],
},
submissions: {
    type: [
        {
            submittedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },

            files: [
                {
                    filename: {
                        type: String,
                        required: true,
                    },

                    url: {
                        type: String,
                        required: true,
                    },

                    localPath: {
                        type: String,
                        required: true,
                    },

                    mimetype: String,

                    size: Number,
                },
            ],

            submittedAt: {
                type: Date,
                // Date.now() (brackets ke saath) server start ka time fix kar deta tha
                default: Date.now,
            },

            status: {
                type: String,
                enum: ["pending", "approved", "rejected"],
                default: "pending",
            },

            feedback: {
                type: String,
                default: "",
            },

            reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
},

reviewedAt: {
    type: Date,
},
        },
    ],
    default: [],
},
  },
  { timestamps: true },
);

// Project ke tasks jaldi dhoondne ke liye (sabse zyada use hone wali query)
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });

export const Task = mongoose.model("Task", taskSchema);
