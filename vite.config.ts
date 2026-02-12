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

export default defineConfig({
  base: "/di/",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commitSha),
    __APP_COMMIT_DATE__: JSON.stringify(commitDate),
  },
});
