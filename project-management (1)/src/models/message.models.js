import mongoose, { Schema } from "mongoose";

// Project chat ka ek message
const messageSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

// Ek project ke messages naye se purane (pagination isi par chalta hai)
messageSchema.index({ project: 1, _id: -1 });

export const Message = mongoose.model("Message", messageSchema);
