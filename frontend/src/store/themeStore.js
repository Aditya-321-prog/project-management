import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useThemeStore = create(
  persist(
    (set) => ({
      dark: false,

      toggleTheme: () =>
        set((state) => ({
          dark: !state.dark,
        })),
    }),
    {
      name: "theme-storage",
    }
  )
);