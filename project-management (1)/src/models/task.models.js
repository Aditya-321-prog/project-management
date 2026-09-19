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

    // Task kab complete hua (analytics ke liye) - apne aap set hota hai
    completedAt: {
      type: Date,
      default: null,
    },

    // Kis deadline ke liye reminder bhej chuke hain (duplicate na jaaye).
    // Deadline badli to ye match nahi karega aur naya reminder jaayega.
    reminders: {
      dueSoonFor: { type: Date, default: null },
      overdueFor: { type: Date, default: null },
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

      // Local storage par file ka path (Cloudinary par null)
      localPath: {
        type: String,
        default: null,
      },

      // Cloudinary par file ki id (delete karne ke liye)
      publicId: {
        type: String,
        default: null,
      },

      resourceType: {
        type: String,
        default: null,
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
                        default: null,
                    },

                    publicId: {
                        type: String,
                        default: null,
                    },

                    resourceType: {
                        type: String,
                        default: null,
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

// Status "completed" hote hi completedAt set, wapas khulne par hata do.
// (Kanban, Edit, Review - sab task.save() use karte hain, isliye ek jagah kaafi hai)
taskSchema.pre("save", function () {
  if (this.isNew || this.isModified("status")) {
    if (this.status === "completed") {
      this.completedAt = this.completedAt || new Date();
    } else {
      this.completedAt = null;
    }
  }
});

// Project ke tasks jaldi dhoondne ke liye (sabse zyada use hone wali query)
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });

export const Task = mongoose.model("Task", taskSchema);
