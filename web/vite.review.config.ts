import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Review build: ONE self-contained HTML (JS, CSS, the Manrope font inlined), copied to docs/artifacts/11-design-review.html.
// REVIEW_ONLY=tough-talk builds the focused page (only the Tough talk rows); unset = the full page.
export default defineConfig({
  define: { __REVIEW_ONLY__: JSON.stringify(process.env.REVIEW_ONLY ?? "") },
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: "dist-review",
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: "review.html" },
  },
});
