/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { userTestTracker } from "./scripts/ut-tracker-plugin.mjs";

// Dev server on 5173; the FastAPI backend (127.0.0.1:8000) accepts this origin (IC_DEV_ORIGINS).
// `npm run build` writes app/web/dist, which the backend serves at "/".
// VITE_UT_ENDPOINT (user test build, `npm run ut`) adds the tracker; without it the build is the normal one.
export default defineConfig(({ mode }) => {
  const utEndpoint = loadEnv(mode, ".", "VITE_").VITE_UT_ENDPOINT ?? "";
  return {
  plugins: [react(), ...(utEndpoint ? [userTestTracker(utEndpoint)] : [])],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: false },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true, changeOrigin: false },
    },
  },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  };
});
