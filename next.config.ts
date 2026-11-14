import type { NextConfig } from "next";
// Same version as the release command and workflow (scripts/app-version.mjs).
import { appVersion } from "./scripts/app-version.mjs";

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
