import multer from "multer";
import fs from "fs";
import path from "path";
import { ApiError } from "../utils/api-error.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        let folder = "public/images";

        if (req.uploadFolder) {
            folder = `public/${req.uploadFolder}`;
        }

        fs.mkdirSync(folder, { recursive: true });

        cb(null, folder);
    },

    filename: function (req, file, cb) {

        // File ke naam se ajeeb characters / spaces hata do (URL me dikkat deta tha)
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 80) || "file";

        cb(null, `${Date.now()}-${base}${ext}`);
    },
});

// Ye files browser me khul kar JavaScript chala sakti hain (XSS),
// aur hamare server ke domain se serve hoti hain - isliye block
const BLOCKED_MIME_TYPES = [
    "text/html",
    "application/xhtml+xml",
    "image/svg+xml",
    "application/javascript",
    "text/javascript",
];
const BLOCKED_EXTENSIONS = [".html", ".htm", ".xhtml", ".svg", ".js", ".mjs"];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (
        BLOCKED_MIME_TYPES.includes(file.mimetype) ||
        BLOCKED_EXTENSIONS.includes(ext)
    ) {
        return cb(new ApiError(400, `File type not allowed: ${file.originalname}`));
    }

    // Profile photo sirf image honi chahiye
    if (req.uploadFolder === "avatars" && !file.mimetype.startsWith("image/")) {
        return cb(new ApiError(400, "Avatar must be an image"));
    }

    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
    },
});
