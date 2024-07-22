import { defineConfig } from "vite";
import vercel from "vite-plugin-vercel";

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [vercel()],
});
