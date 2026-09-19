import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

export default function ThemeToggle() {
  const { dark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 transition-all duration-200 hover:bg-slate-100 active:scale-90 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <span
        key={dark ? "sun" : "moon"}
        className="animate-spin-in text-slate-700 dark:text-slate-200"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
}
