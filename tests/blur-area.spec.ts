import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

// A photo post with one pixelated area, opened from a design file.
function design() {
  const regions = [{ id: "r1", kind: "blur", shape: "rect", x: 0.3, y: 0.4, w: 0.4, h: 0.1, strength: 60 }];
  const state = { media: "photo", size: "square", texts: [], stickers: [], regions, photoId: "p", background: { kind: "solid", from: "#ffffff", to: "#ffffff" } };
  return zipSync({
    "design.json": strToU8(JSON.stringify({ format: "bubble-studio-design", version: 1, name: "Blur", state, assets: [{ id: "p", kind: "image" }], types: { p: "image/jpeg" } })),
    "media/p": readFileSync("tests/fixtures/photo1.jpg"),
  });
}

test("resize a blur area from its sides and rotate it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('input[aria-label="Open a design file"]').setInputFiles({ name: "blur.bubble", mimeType: "application/zip", buffer: Buffer.from(design()) });
  const area = page.getByRole("button", { name: "Blurred area" });
  await page.getByRole("button", { name: "Blur", exact: true }).click();
  await area.click();
  const before = (await area.boundingBox())!;

  // Pull the bottom side down: taller, same width and top.
  const bottom = (await area.locator('[data-handle="bottom"]').boundingBox())!;
  await page.mouse.move(bottom.x + bottom.width / 2, bottom.y + bottom.height / 2);
  await page.mouse.down();
  await page.mouse.move(bottom.x + bottom.width / 2, bottom.y + 60, { steps: 6 });
  await page.mouse.up();
  const taller = (await area.boundingBox())!;
  expect(taller.height).toBeGreaterThan(before.height + 50);
  expect(Math.abs(taller.width - before.width)).toBeLessThan(2);
  expect(Math.abs(taller.y - before.y)).toBeLessThan(2);

  // Pull the left side out: wider, same height.
  const left = (await area.locator('[data-handle="left"]').boundingBox())!;
  await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await page.mouse.down();
  await page.mouse.move(left.x - 40, left.y + left.height / 2, { steps: 6 });
  await page.mouse.up();
  const wider = (await area.boundingBox())!;
  expect(wider.width).toBeGreaterThan(taller.width + 30);
  expect(Math.abs(wider.height - taller.height)).toBeLessThan(2);

  // Rotate 30°.
  const rotation = page.getByRole("group", { name: "Rotation" }).getByRole("slider");
  await rotation.focus();
  await page.keyboard.press("ArrowRight", { delay: 5 });
  for (let i = 1; i < 30; i++) await page.keyboard.press("ArrowRight");
  await expect(area).toHaveCSS("transform", /matrix\(0\.866/);
  if (process.env.OUT) await page.getByRole("img", { name: "Post preview" }).screenshot({ path: process.env.OUT });
  expect(errors).toEqual([]);
});
