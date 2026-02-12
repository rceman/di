import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const getGitValue = (command: string, fallback: string) => {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
};

const commitSha = getGitValue("git rev-parse --short HEAD", "dev");
const commitDate = getGitValue("git log -1 --format=%cI", "");
const versionTag = `v${commitSha}`;

export default defineConfig({
  base: "/di/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${versionTag}-[hash].js`,
        chunkFileNames: `assets/[name]-${versionTag}-[hash].js`,
        assetFileNames: `assets/[name]-${versionTag}-[hash][extname]`,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(commitSha),
    __APP_COMMIT_DATE__: JSON.stringify(commitDate),
  },
});
