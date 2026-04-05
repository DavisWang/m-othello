import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub project Pages: set VITE_BASE_PATH=/repo-name/ in CI (with trailing slash). */
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
});
