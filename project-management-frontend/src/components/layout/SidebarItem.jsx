import { NavLink } from "react-router-dom";

export default function SidebarItem({
  title,
  path,
  icon: Icon,
  onClick,
}) {
  return (
    <NavLink
      to={path}
      end={path === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
          isActive
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
            : "text-slate-600 hover:bg-slate-100 hover:translate-x-1 dark:text-slate-300 dark:hover:bg-slate-800"
        }`
      }
    >
      <Icon size={18} className="transition-transform duration-200 group-hover:scale-110" />
      <span className="font-medium">{title}</span>
    </NavLink>
  );
}
