import { Loader2 } from "lucide-react";

export default function AuthButton({
  children,
  loading,
  disabled,
  className = "",
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={18} />
          <span>Signing In...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}