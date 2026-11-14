// The one place the app's version is worked out, shared by the web build (next.config.ts), the
// release command (scripts/release.mjs) and the release workflow: major.minor from the VERSION
// file, patch = commits since VERSION last changed (bumping VERSION to "1.4" starts at 1.4.0).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Run from the project root (npm scripts, next.config.ts, the workflow and tests all are).
const root = process.cwd();

export function baseVersion() {
  return readFileSync(path.join(root, "VERSION"), "utf8").trim();
}

export function appVersion() {
  const git = (cmd) => execSync(cmd, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  try {
    const since = git("git log -1 --format=%H -- VERSION");
    return `${baseVersion()}.${since ? git(`git rev-list --count ${since}..HEAD`) : 0}`;
  } catch {
    return `${baseVersion()}.0`;
  }
}

// `node scripts/app-version.mjs` prints the version (the workflow uses this).
if (process.argv[1]?.endsWith("app-version.mjs")) console.log(appVersion());
