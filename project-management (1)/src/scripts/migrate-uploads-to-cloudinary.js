// ==========================================================
// Purani local files (public/ folder) ko Cloudinary par bhejna - EK BAAR chalana hai
//
//   npm run migrate:cloudinary            -> asli migration
//   npm run migrate:cloudinary -- --dry   -> sirf dikhao kya hoga, kuch badlo mat
//
// Local files delete NAHI hoti (backup rehta hai). Sab theek lage to
// public/ folder baad me khud hata sakte ho.
// ==========================================================
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Task } from "../models/task.models.js";
import { User } from "../models/user.models.js";
import { isCloudStorage } from "../utils/storage.js";

const DRY = process.argv.includes("--dry");
const ROOT = process.env.CLOUDINARY_FOLDER || "task-manager";

const resourceTypeFor = (mimetype = "", file = "") => {
  const ext = path.extname(file).toLowerCase();
  if ((mimetype.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) && ext !== ".svg") {
    return "image";
  }
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

const stats = { uploaded: 0, missing: 0, failed: 0, skipped: 0 };

const upload = async (file, folder, extra = {}) => {
  if (!file?.localPath || file.publicId) {
    stats.skipped += 1;
    return null;
  }

  if (!fs.existsSync(file.localPath)) {
    console.warn(`  ⚠️  File nahi mili: ${file.localPath}`);
    stats.missing += 1;
    return null;
  }

  const resourceType = resourceTypeFor(file.mimetype, file.localPath);
  const ext = path.extname(file.localPath);
  const base = path.basename(file.localPath, ext);

  if (DRY) {
    console.log(`  [dry] ${file.localPath} -> ${ROOT}/${folder} (${resourceType})`);
    stats.uploaded += 1;
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(file.localPath, {
      folder: `${ROOT}/${folder}`,
      public_id: resourceType === "raw" ? `${base}${ext}` : base,
      resource_type: resourceType,
      overwrite: false,
      ...extra,
    });
    stats.uploaded += 1;
    console.log(`  ✅ ${file.localPath}`);
    return { url: result.secure_url, publicId: result.public_id, resourceType, localPath: null };
  } catch (error) {
    stats.failed += 1;
    console.error(`  ❌ ${file.localPath}: ${error.message}`);
    return null;
  }
};

const run = async () => {
  if (!isCloudStorage()) {
    console.error("❌ .env me CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET set karo pehle.");
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await mongoose.connect(process.env.MONGO_URI);
  console.log(DRY ? "🔍 DRY RUN - kuch save nahi hoga\n" : "🚀 Migration shuru\n");

  // ---------- Avatars ----------
  const users = await User.find({
    "avatar.localPath": { $nin: [null, ""] },
    "avatar.publicId": { $in: [null, undefined] },
  });
  console.log(`Avatars: ${users.length}`);
  for (const user of users) {
    const stored = await upload(user.avatar, "avatars", {
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });
    if (stored) {
      user.avatar = { ...stored, localPath: "" };
      await user.save({ validateBeforeSave: false });
    }
  }

  // ---------- Task attachments + submissions ----------
  const tasks = await Task.find({
    $or: [
      { "attachments.localPath": { $nin: [null, ""] } },
      { "submissions.files.localPath": { $nin: [null, ""] } },
    ],
  });
  console.log(`\nTasks with local files: ${tasks.length}`);

  for (const task of tasks) {
    console.log(`\n📁 ${task.title}`);
    let changed = false;

    for (const att of task.attachments) {
      const stored = await upload(att, "task-attachments");
      if (stored) {
        Object.assign(att, stored);
        changed = true;
      }
    }

    for (const submission of task.submissions) {
      for (const f of submission.files) {
        const stored = await upload(f, "task-submissions");
        if (stored) {
          Object.assign(f, stored);
          changed = true;
        }
      }
    }

    if (changed) await task.save({ validateBeforeSave: false });
  }

  console.log("\n==========================");
  console.log(stats);
  console.log("==========================");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
