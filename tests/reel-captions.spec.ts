import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Two pasted lines spread over a 4 s reel, highlight style: the export shows the yellow caption
// box, and the .srt download times the lines over the reel.
test("captions from pasted lines, in the export and as an .srt", async ({ page }) => {
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

  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("textbox", { name: "Caption lines" }).fill("Fresh bread daily\nOpen until 9 pm");
  await page.getByRole("button", { name: "Spread lines over the reel" }).click();
  const list = page.getByRole("list", { name: "Captions" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("radio", { name: "Highlight" }).click();

  const srtDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .srt" }).click();
  const srt = readFileSync((await (await srtDownload).path())!, "utf8");
  // Longer lines get more time: 17 and 15 characters over 4 s.
  expect(srt).toBe("1\n00:00:00,000 --> 00:00:02,124\nFresh bread daily\n\n2\n00:00:02,125 --> 00:00:03,999\nOpen until 9 pm\n");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /^Export (MP4|WebM)$/ }).click();
  const data = readFileSync((await (await download).path())!).toString("base64");

  // Look for the yellow box across the caption band (80% down the frame).
  const yellow = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const video = document.createElement("video");
    video.muted = true;
    video.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = reject;
    });
    video.currentTime = 1;
    await new Promise((resolve) => (video.onseeked = resolve));
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const d = ctx.getImageData(0, Math.round(c.height * 0.8), c.width, 1).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 190 && d[i + 2] < 140) n++;
    return n;
  }, data);
  expect(yellow).toBeGreaterThan(50);
  expect(errors).toEqual([]);
});
