import { defineConfig } from "vite";

export default defineConfig(({ isPreview }) => ({
  appType: isPreview ? "mpa" : "spa",
}));
