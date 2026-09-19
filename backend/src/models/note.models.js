import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ project: 1, createdAt: -1 });

export const Note = mongoose.model("Note", noteSchema);