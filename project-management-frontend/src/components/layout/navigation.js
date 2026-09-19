import {
  FaHome,
  FaFolderOpen,
  FaClipboardList,
  FaUserCircle,
} from "react-icons/fa";

// Members / Notes ke links hataye - unke pages bane hi nahi the
export const navigation = [
  {
    title: "Dashboard",
    path: "/",
    icon: FaHome,
  },
  {
    title: "Projects",
    path: "/projects",
    icon: FaFolderOpen,
  },
  {
    title: "My Tasks",
    path: "/my-tasks",
    icon: FaClipboardList,
  },
  {
    title: "Profile",
    path: "/profile",
    icon: FaUserCircle,
  },
];