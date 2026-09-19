import { X } from "lucide-react";
import Logo from "./Logo";
import SidebarItem from "./SidebarItem";
import { navigation } from "./navigation";

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <Logo />
      </div>

      <nav className="flex-1 space-y-2 p-5 stagger">
        {navigation.map((item) => (
          <SidebarItem key={item.path} {...item} onClick={onNavigate} />
        ))}
      </nav>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-72 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-slide-in-left dark:bg-slate-900">
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
