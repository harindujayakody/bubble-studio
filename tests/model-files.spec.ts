import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The desktop app downloads background removal files pinned by size and SHA-256 in desktop/main.js.
// They must be the same files as the onnxruntime-web the page is built with, and the U²-Netp we test with.
test("pinned background removal files match the installed ones", () => {
  const main = readFileSync("desktop/main.js", "utf8");
  const ort = JSON.parse(readFileSync("node_modules/onnxruntime-web/package.json", "utf8")).version;
  expect(main, "update ORT and the two ort hashes in desktop/main.js").toContain(`const ORT = "${ort}";`);
  for (const file of [
    "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs",
    "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm",
    "desktop-assets/u2netp.onnx",
  ]) {
    const data = readFileSync(file);
    const sha = createHash("sha256").update(data).digest("hex");
    expect(main, file).toContain(`size: ${data.length}, sha256: "${sha}"`);
  }
});
