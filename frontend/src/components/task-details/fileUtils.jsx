import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
} from "lucide-react";

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ext = (name = "") => name.split(".").pop()?.toLowerCase() || "";

// File type ke hisaab se icon + rang
export const fileVisual = (file) => {
  const type = file?.mimetype || "";
  const e = ext(file?.filename || file?.name);

  if (type.startsWith("image/")) return { Icon: FileImage, color: "text-pink-500 bg-pink-50 dark:bg-pink-950/40" };
  if (type.startsWith("video/")) return { Icon: FileVideo, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" };
  if (type === "application/pdf" || e === "pdf") return { Icon: FileText, color: "text-red-500 bg-red-50 dark:bg-red-950/40" };
  if (["xls", "xlsx", "csv"].includes(e)) return { Icon: FileSpreadsheet, color: "text-green-600 bg-green-50 dark:bg-green-950/40" };
  if (["ppt", "pptx"].includes(e)) return { Icon: Presentation, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(e)) return { Icon: FileArchive, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" };
  if (["doc", "docx", "txt", "md"].includes(e)) return { Icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" };
  return { Icon: File, color: "text-slate-500 bg-slate-100 dark:bg-slate-800" };
};

// Uploaded files ki list (click par nayi tab me khulti hai)
export function FileList({ files = [], compact = false }) {
  if (!files.length) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {files.map((file, index) => {
        const { Icon, color } = fileVisual(file);
        const isImage = file.mimetype?.startsWith("image/");
        return (
          <a
            key={file._id || index}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-slate-800/60"
          >
            {isImage && !compact ? (
              <img
                src={file.url}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon size={18} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                {file.filename}
              </span>
              <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
