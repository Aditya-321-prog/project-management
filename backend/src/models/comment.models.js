import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
    {
        task: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
        },

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

        content: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

commentSchema.index({ task: 1, createdAt: 1 });

export const Comment = mongoose.model(
    "Comment",
    commentSchema
);