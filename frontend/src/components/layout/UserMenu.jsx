import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
export default function UserMenu() {
  const { user, logout } = useAuthStore();

const navigate = useNavigate();

const handleLogout = async () => {
  await logout();

  navigate("/login");
};

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>
          {(user?.fullName || user?.username)
  ?.charAt(0)
  .toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="hidden md:block">
        <h3>{user?.fullName || user?.username}</h3>

        <p className="text-sm text-slate-500">
          {user?.email}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="rounded-lg border px-3 py-2 hover:bg-red-50"
        >
        <LogOut size={18} />
    </button>
    </div>
  );
}