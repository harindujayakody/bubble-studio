import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Version shown in the app: major.minor from the VERSION file, patch = commits since VERSION
// last changed (so bumping VERSION to "1.1" starts at 1.1.0). The release workflow numbers the
// installers the same way, so the web build and the desktop app always agree.
function appVersion() {
  const base = readFileSync("./VERSION", "utf8").trim();
  const git = (cmd: string) => execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  try {
    const since = git("git log -1 --format=%H -- VERSION");
    return `${base}.${since ? git(`git rev-list --count ${since}..HEAD`) : 0}`;
  } catch {
    return `${base}.0`;
  }
}

// `npm run desktop:build` sets BUILD_TARGET=desktop to produce a static export in out/ for Electron.
const desktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  ...(desktop ? { output: "export" as const } : {}),
  env: { NEXT_PUBLIC_APP_VERSION: appVersion() },
  // Partial prerendering needs a server, so the static desktop export turns it off.
  cacheComponents: !desktop,
  partialPrefetching: !desktop,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
