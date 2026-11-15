import { createReadStream, existsSync, mkdtempSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test, type Page } from "@playwright/test";

// The desktop app for real: the first "Remove background" downloads the runtime and U²-Netp, then
// "Best edges" downloads only IS-Net (from a local server standing in for GitHub and jsDelivr), and
// each one removes the background.
// Needs the desktop build (npm run desktop:web) and desktop-assets/isnet-general-use.onnx, so it
// only runs on a machine that has both; CI skips it.
const MODEL = "desktop-assets/isnet-general-use.onnx";
test.skip(!existsSync(MODEL) || !existsSync("desktop/web/index.html"), "needs the desktop build and the IS-Net model file");
test.setTimeout(300_000);

/** Brightness at a point of the post (fractions). */
const lum = (page: Page, fx: number, fy: number) =>
  page.getByRole("img", { name: "Post preview" }).evaluate((c: HTMLCanvasElement, [x, y]) => {
    const d = c.getContext("2d")!.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
    return d[0] + d[1] + d[2];
  }, [fx, fy]);

test("remove a background with the built-in model and with Best edges", async () => {
  const files: Record<string, string> = {
    "isnet-general-use.onnx": MODEL,
    "u2netp.onnx": "desktop-assets/u2netp.onnx",
    "ort-wasm-simd-threaded.asyncify.wasm": "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm",
    "ort-wasm-simd-threaded.asyncify.mjs": "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs",
  };
  const served: string[] = [];
  const server = createServer((req, res) => {
    const name = path.basename(req.url ?? "");
    const file = files[name];
    if (!file) return void res.writeHead(404).end();
    served.push(name);
    res.writeHead(200, { "content-length": String(statSync(file).size), "content-type": "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const userData = mkdtempSync(path.join(tmpdir(), "bubble-test-"));
  const app = await electron.launch({
    args: ["desktop"],
    env: { ...process.env, BUBBLE_STUDIO_USER_DATA: userData, BUBBLE_STUDIO_MODEL_BASE: `http://127.0.0.1:${port}` },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: /Photo post Filters/ }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose photo" }).first().click();
    await (await chooser).setFiles("public/samples/portrait.webp");
    await page.getByRole("button", { name: "Photo", exact: true }).click();

    // The photo fills the post: a top corner is the room behind the woman, not white.
    await expect.poll(() => lum(page, 0.05, 0.05)).toBeLessThan(740);

    // First use says it will download, then downloads and removes: the post's white background shows.
    await expect(page.getByText(/The first time, this downloads the background remover \(3\d MB\)/)).toBeVisible();
    await page.getByRole("button", { name: "Remove background" }).click();
    await expect(page.getByText("Background removed")).toBeVisible({ timeout: 120_000 });
    await expect.poll(() => lum(page, 0.05, 0.05)).toBeGreaterThan(740);
    expect(served.sort()).toEqual(["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm", "u2netp.onnx"]);
    await expect(page.getByText(/The first time/)).toHaveCount(0);
    await page.getByRole("button", { name: "Restore original background" }).click();

    // Best edges: downloads, checks and keeps the model, then uses it.
    await page.getByRole("switch", { name: "Best edges" }).click();
    await expect(page.getByText("Best edges is ready")).toBeVisible({ timeout: 120_000 });
    expect(statSync(path.join(userData, "models", "isnet-general-use.onnx")).size).toBe(statSync(MODEL).size);
    expect(served.filter((n) => n.startsWith("ort-")).length, "the runtime is downloaded once").toBe(2);
    await page.getByRole("button", { name: "Remove background" }).click();
    await expect(page.getByText("Background removed").first()).toBeVisible({ timeout: 180_000 });
    await expect.poll(() => lum(page, 0.05, 0.05), { timeout: 30_000 }).toBeGreaterThan(740);
    // The subject stays: the middle of the face isn't white.
    expect(await lum(page, 0.45, 0.32)).toBeLessThan(700);
  } finally {
    await app.close();
    server.close();
  }
});
