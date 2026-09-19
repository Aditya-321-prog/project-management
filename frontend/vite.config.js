import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Badi libraries alag files me - browser inhe cache kar leta hai,
        // tumhara code badalne par dobara download nahi karni padti
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["chart.js", "react-chartjs-2"],
          realtime: ["socket.io-client", "axios"],
        },
      },
    },
  },
});
