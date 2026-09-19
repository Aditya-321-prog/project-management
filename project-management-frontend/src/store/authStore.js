import { create } from "zustand";
import { getCurrentUser, logoutUser } from "../services/authService";
import { connectSocket, disconnectSocket } from "../socket/socket";

export const useAuthStore = create((set) => ({

  user: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) => {
    // Server login cookie se khud sahi room join kara deta hai
    connectSocket();

    set({
      user,
      isAuthenticated: true,
      loading: false,
    });
  },

  checkAuth: async () => {
    try {
      const res = await getCurrentUser();
      const user = res.data.data;

      connectSocket();

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  // Refresh token bhi expire ho gaya -> user ko login page par bhejo
  clearSession: () => {
    disconnectSocket();
    set({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  logout: async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.log(error);
    } finally {
      disconnectSocket();
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

}));
