// Copies the ONNX Runtime WASM files the background remover loads into public/ort, so they are
// served by the dev server, the static export and the desktop app (no CDN; works offline).
import { copyFileSync, mkdirSync } from "node:fs";

const files = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];
mkdirSync("public/ort", { recursive: true });
for (const f of files) copyFileSync(`node_modules/onnxruntime-web/dist/${f}`, `public/ort/${f}`);
console.log("onnxruntime files copied to public/ort");
