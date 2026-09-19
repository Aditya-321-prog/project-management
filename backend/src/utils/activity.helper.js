import { Activity } from "../models/activity.models.js";

export const createActivity = async ({
  project,
  user,
  action,
  description,
}) => {
  try {
    await Activity.create({
      project,
      user,
      action,
      description,
    });
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};