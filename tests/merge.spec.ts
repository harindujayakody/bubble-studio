import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Two 1.5 s clips (red with a 440 Hz tone, blue with 660 Hz) joined with a 0.6 s crossfade:
// the result overlaps them, so it lasts 2.4 s, and it is named after the first clip.
test("merge two clips with a crossfade", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Merge videos/ }).click({ timeout: 2_000 });
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  await page.locator('input[type="file"]').setInputFiles(["tests/fixtures/red.mp4", "tests/fixtures/blue.mp4"]);
  await page.getByRole("radio", { name: "Crossfade" }).click();
  await expect(page.getByText("2 clips · 0:02")).toBeVisible();

  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "Merge 2 videos" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("red_merge.mp4");

  // Read the result's length back in the page.
  const data = readFileSync((await file.path())!).toString("base64");
  const seconds = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const video = document.createElement("video");
    video.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    return video.duration;
  }, data);
  expect(seconds).toBeGreaterThan(2.3);
  expect(seconds).toBeLessThan(2.55);
  expect(errors).toEqual([]);
});
