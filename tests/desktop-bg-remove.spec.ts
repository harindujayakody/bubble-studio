import { createReadStream, existsSync, mkdtempSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test, type Page } from "@playwright/test";

// The desktop app for real: background removal with the built-in model, then "Best edges" downloads
// IS-Net (from a local server standing in for GitHub), checks it, and removes the background with it.
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
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-length": String(statSync(MODEL).size), "content-type": "application/octet-stream" });
    createReadStream(MODEL).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const userData = mkdtempSync(path.join(tmpdir(), "bubble-test-"));
  const app = await electron.launch({
    args: ["desktop"],
    env: { ...process.env, BUBBLE_STUDIO_USER_DATA: userData, BUBBLE_STUDIO_MODEL_URL: `http://127.0.0.1:${port}/isnet.onnx` },
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

    // Built-in model: the background goes, so the post's white background shows in the corner.
    await page.getByRole("button", { name: "Remove background" }).click();
    await expect(page.getByText("Background removed")).toBeVisible({ timeout: 120_000 });
    await expect.poll(() => lum(page, 0.05, 0.05)).toBeGreaterThan(740);
    await page.getByRole("button", { name: "Restore original background" }).click();

    // Best edges: downloads, checks and keeps the model, then uses it.
    await page.getByRole("switch", { name: "Best edges" }).click();
    await expect(page.getByText("Best edges is ready")).toBeVisible({ timeout: 120_000 });
    expect(statSync(path.join(userData, "models", "isnet-general-use.onnx")).size).toBe(statSync(MODEL).size);
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
