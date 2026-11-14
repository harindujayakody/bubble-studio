import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

// A design whose photo is a cut-out (left half red, right half transparent) with its original
// (solid blue) kept for Restore, as background removal leaves it.
function cutoutDesign() {
  const state = { media: "photo", size: "square", texts: [], stickers: [], regions: [], photoId: "cut", photoOriginal: "orig", background: { kind: "solid", from: "#ffffff", to: "#ffffff" } };
  const assets = [{ id: "cut", kind: "image" }, { id: "orig", kind: "image" }];
  return zipSync({
    "design.json": strToU8(JSON.stringify({ format: "bubble-studio-design", version: 1, name: "Cut-out", state, assets, types: { cut: "image/png", orig: "image/png" } })),
    "media/cut": readFileSync("tests/fixtures/cut.png"),
    "media/orig": readFileSync("tests/fixtures/original.png"),
  });
}

/** Colour of the post at a point (fractions). */
const pixel = (page: Page, fx: number, fy: number) =>
  page.getByRole("img", { name: "Post preview" }).evaluate((c: HTMLCanvasElement, [x, y]) => [...c.getContext("2d")!.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data].slice(0, 3), [fx, fy]);

/** Drag across the refine canvas between two points (fractions of it). */
async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const box = (await page.locator("canvas[aria-label^='Cut-out']").boundingBox())!;
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 12 });
  await page.mouse.up();
}

test("refine a cut-out: restore and erase", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: /Open file/ })).toBeVisible();
  await page.locator('input[aria-label="Open a design file"]').setInputFiles({ name: "cut.bubble", mimeType: "application/zip", buffer: Buffer.from(cutoutDesign()) });
  await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible();
  // Left half is the red cut-out; the right half is transparent, so the white background shows.
  await expect.poll(async () => (await pixel(page, 0.25, 0.5))[0]).toBeGreaterThan(200);
  await expect.poll(() => pixel(page, 0.75, 0.5)).toEqual([255, 255, 255]);

  // Restore the right half: the original (blue) comes back there.
  await page.getByRole("button", { name: "Photo", exact: true }).click();
  await page.getByRole("button", { name: "Refine edges" }).click();
  await page.getByRole("radio", { name: "Restore" }).click();
  for (const y of [0.3, 0.45, 0.6, 0.75]) await stroke(page, [0.55, y], [0.95, y]);
  if (process.env.OUT) await page.getByRole("dialog").screenshot({ path: process.env.OUT });
  await page.getByRole("button", { name: "Done" }).click();
  // Restored right half is blue, and the left half is still red.
  await expect.poll(async () => (await pixel(page, 0.75, 0.6))[2]).toBeGreaterThan(200);
  expect((await pixel(page, 0.25, 0.5))[0]).toBeGreaterThan(200);

  // Erase part of the left half: the background shows through.
  await page.getByRole("button", { name: "Refine edges" }).click();
  await page.getByRole("radio", { name: "Erase" }).click();
  for (const y of [0.4, 0.5, 0.6]) await stroke(page, [0.1, y], [0.4, y]);
  await page.getByRole("button", { name: "Done" }).click();
  await expect.poll(() => pixel(page, 0.25, 0.5)).toEqual([255, 255, 255]);
  expect(errors).toEqual([]);
});
