import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

// ==========================================================
// File storage
// .env me CLOUDINARY_* teeno values hon -> files Cloudinary par
// Na hon -> pehle jaisa local "public/" folder (development ke liye)
//
// Kyun? Render / Railway jaise hosts par server ki disk har deploy /
// restart par khaali ho jaati hai -> local uploads gayab ho jaate.
// ==========================================================

let configured = false;

export const isCloudStorage = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

const ensureConfigured = () => {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
};

const ROOT_FOLDER = () => process.env.CLOUDINARY_FOLDER || "task-manager";

// Images -> "image", videos -> "video", baaki sab (PDF, docx, zip...) -> "raw".
// Free Cloudinary account PDFs ko "image" ki tarah deliver nahi karta,
// isliye documents "raw" me rakhte hain - wo seedha download ho jaate hain.
const resourceTypeFor = (mimetype = "") => {
  if (mimetype.startsWith("image/") && mimetype !== "image/svg+xml") return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

const removeLocal = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

/**
 * Multer ki file ko final jagah save karo.
 * folder: "task-attachments" | "task-submissions" | "avatars"
 * Returns: { url, localPath, publicId, resourceType }
 */
export const storeUploadedFile = async (req, file, folder) => {
  if (!isCloudStorage()) {
    return {
      url: `${req.protocol}://${req.get("host")}/${folder}/${file.filename}`,
      localPath: file.path,
      publicId: null,
      resourceType: null,
    };
  }

  ensureConfigured();
  const resourceType = resourceTypeFor(file.mimetype);
  const ext = path.extname(file.filename);
  const base = path.basename(file.filename, ext);

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `${ROOT_FOLDER()}/${folder}`,
      // raw files ke naam me extension zaroori hai (warna download par .pdf nahi lagta)
      public_id: resourceType === "raw" ? `${base}${ext}` : base,
      resource_type: resourceType,
      overwrite: false,
      // Avatar ko chhota karke save karo (bandwidth bachti hai)
      ...(folder === "avatars" && {
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      }),
    });

    return {
      url: result.secure_url,
      localPath: null,
      publicId: result.public_id,
      resourceType,
    };
  } finally {
    // Upload ho ya fail, temporary local file hata do
    removeLocal(file.path);
  }
};

// Kai files ek saath. Beech me koi fail ho to jo upload ho chuki
// unhe bhi hata do (adhura data na bache).
export const storeUploadedFiles = async (req, files = [], folder) => {
  const results = await Promise.allSettled(
    files.map((file) => storeUploadedFile(req, file, folder)),
  );

  const failed = results.find((r) => r.status === "rejected");
  if (failed) {
    const stored = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    await deleteStoredFiles(stored);
    files.forEach((f) => removeLocal(f.path));
    throw failed.reason;
  }

  return results.map((r) => r.value);
};

/**
 * Saved file delete karo (Cloudinary ya local - jo bhi ho).
 * Kabhi error throw nahi karta - file na mile to bhi chalega.
 */
export const deleteStoredFile = async (file) => {
  if (!file) return;

  try {
    if (file.publicId) {
      ensureConfigured();
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: file.resourceType || "image",
        invalidate: true,
      });
    } else if (file.localPath) {
      await fs.promises.unlink(file.localPath);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("File delete failed:", file.publicId || file.localPath, error?.message);
    }
  }
};

export const deleteStoredFiles = async (files = []) => {
  await Promise.all(files.filter(Boolean).map(deleteStoredFile));
};

// Multer ki temp files (jab request beech me fail ho jaaye)
export const removeTempUploads = (files = []) => {
  files.forEach((f) => removeLocal(f?.path));
};
