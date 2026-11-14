// Build the static web app for the desktop shell and copy it into desktop/web.
// Usage: node scripts/desktop-build.mjs
import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
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
// Keep the inference assets out of the public web app; Electron serves these locally.
mkdirSync(path.join(web, "models"), { recursive: true });
mkdirSync(path.join(web, "ort"), { recursive: true });
copyFileSync(path.join(root, "desktop-assets", "u2netp.onnx"), path.join(web, "models", "u2netp.onnx"));
// The WebGPU build of ONNX Runtime (the "asyncify" files its webgpu entry loads), which also runs
// on the CPU when there's no usable GPU.
for (const file of ["ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.asyncify.mjs"]) {
  copyFileSync(path.join(root, "node_modules", "onnxruntime-web", "dist", file), path.join(web, "ort", file));
}
copyFileSync(path.join(root, "public", "favicon.png"), path.join(root, "desktop", "icon.png"));
console.log("Desktop web build ready in desktop/web");
