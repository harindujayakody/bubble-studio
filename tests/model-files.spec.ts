import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The desktop app downloads background removal models pinned by size and SHA-256 in desktop/main.js;
// the built-in one must be the U²-Netp the app is tested with.
test("the pinned built-in model matches the one we test with", () => {
  const main = readFileSync("desktop/main.js", "utf8");
  for (const file of ["desktop-assets/u2netp.onnx"]) {
    const data = readFileSync(file);
    const sha = createHash("sha256").update(data).digest("hex");
    expect(main, file).toContain(`size: ${data.length}, sha256: "${sha}"`);
  }
});
