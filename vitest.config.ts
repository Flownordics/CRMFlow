/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
      ".netlify/**",
      "**/node_modules/**"
    ],
    environmentOptions: {
      jsdom: {
        resources: "usable",
      }
    },
    deps: {
      inline: ["react", "react-dom"]
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "tests/e2e/",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
        "coverage/",
      ],
    },
  },
});
