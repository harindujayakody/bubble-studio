// Build the static web app for the desktop shell and copy it into desktop/web.
// Usage: node scripts/desktop-build.mjs
import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");
const web = path.join(root, "desktop", "web");

rmSync(out, { recursive: true, force: true });
const build = spawnSync("npx next build", {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BUILD_TARGET: "desktop" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

rmSync(web, { recursive: true, force: true });
cpSync(out, web, { recursive: true });
copyFileSync(path.join(root, "public", "favicon.png"), path.join(root, "desktop", "icon.png"));
console.log("Desktop web build ready in desktop/web");
