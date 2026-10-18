import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Version shown in the app: major.minor from desktop/package.json, patch = number of commits,
// which is also how the release workflow numbers installers, so web and desktop agree.
function appVersion() {
  const base = JSON.parse(readFileSync("./desktop/package.json", "utf8")).version.split(".").slice(0, 2).join(".");
  try {
    const count = execSync("git rev-list --count HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return `${base}.${count}`;
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
