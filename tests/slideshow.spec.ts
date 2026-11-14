import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Two photos, 3 s each, crossfade (0.6 s): a 5.4 s 9:16 slideshow that opens as a reel and exports.
test("make a photo slideshow and export it as a reel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo slideshow/ }).click({ timeout: 2_000 });
    await expect(page.locator('input[type="file"][multiple]')).toBeAttached({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  await page.locator('input[type="file"][multiple]').setInputFiles(["tests/fixtures/photo1.jpg", "tests/fixtures/photo2.jpg"]);
  await expect(page.getByText("2 photos · 0:05.4")).toBeVisible();
  await page.getByRole("button", { name: "Create slideshow" }).click();

  // Opens in the editor as a reel.
  await expect(page.getByText(/0:05\.4 long/)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /^Export (MP4|WebM)$/ }).click();
  const data = readFileSync((await (await download).path())!).toString("base64");

  const meta = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const video = document.createElement("video");
    video.muted = true;
    video.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    return { seconds: video.duration, w: video.videoWidth, h: video.videoHeight };
  }, data);
  expect(meta.seconds).toBeGreaterThan(5.3);
  expect(meta.seconds).toBeLessThan(5.55);
  expect([meta.w, meta.h]).toEqual([1080, 1920]);
  expect(errors).toEqual([]);
});
