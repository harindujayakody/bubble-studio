import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// A 4 s clip, red for 2 s then blue. Split at 2 s, delete the red part and play at 2x:
// the reel is the blue half at double speed, so it lasts 1 s and opens on blue.
test("split, delete a part and speed up a reel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Reel\s*9:16/ }).click({ timeout: 2_000 });
    await expect(page.getByRole("button", { name: "Choose video" }).first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose video" }).first().click();
  await (await chooser).setFiles("tests/fixtures/red-blue.mp4");
  await expect(page.getByRole("button", { name: "Split at playhead" })).toBeVisible();

  // Put the playhead at 2 s, split, delete part 1.
  await page.evaluate(async () => {
    const v = document.querySelector<HTMLVideoElement>("video[aria-hidden]")!;
    v.pause();
    v.currentTime = 2;
    await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
  });
  await page.getByRole("button", { name: "Split at playhead" }).click();
  await page.getByRole("button", { name: "Delete part 1" }).click();
  await page.getByRole("radio", { name: "2×" }).click();
  await expect(page.getByText(/0:01\.0 long/)).toBeVisible();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /^Export (MP4|WebM)$/ }).click();
  const file = await download;
  const data = readFileSync((await file.path())!).toString("base64");

  const result = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const video = document.createElement("video");
    video.muted = true;
    video.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = reject;
    });
    // Seek so a decoded frame is ready to draw.
    video.currentTime = 0.3;
    await new Promise((resolve) => (video.onseeked = resolve));
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    c.getContext("2d")!.drawImage(video, 0, 0, 8, 8);
    const [r, , b] = c.getContext("2d")!.getImageData(4, 4, 1, 1).data;
    return { seconds: video.duration, r, b };
  }, data);
  expect(result.seconds).toBeGreaterThan(0.9);
  expect(result.seconds).toBeLessThan(1.15);
  expect(result.b).toBeGreaterThan(result.r);
  expect(errors).toEqual([]);
});
