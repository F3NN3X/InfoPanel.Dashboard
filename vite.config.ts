import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset base: the build works from any path it is served at.
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // The config store and image proxy live in the dashboard server
    // (server.mjs, `npm start`); forward them so dev and the built pages
    // share one config.
    proxy: {
      "/api": "http://127.0.0.1:3922",
      "/events/config": "http://127.0.0.1:3922",
    },
  },
});
