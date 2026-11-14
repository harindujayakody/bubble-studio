import { expect, test } from "@playwright/test";

// Every template renders in every gallery size (1:1, 4:5, 9:16) without errors and isn't blank,
// and a 9:16 template opens in the editor and exports at its size.
// shortcut: no pixel snapshots; fonts render differently on Windows, macOS and the Linux CI runner.
test("every template renders, and a story template exports", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });

  const showAll = page.getByRole("button", { name: /^Show all \d+ templates$/ });
  await expect(async () => {
    await showAll.click({ timeout: 2_000 });
    await expect(showAll).toBeHidden({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  const tiles = page.getByRole("button", { name: /^Use template: / });
  const count = await tiles.count();
  expect(count).toBeGreaterThanOrEqual(69);

  // Every template in every size: all previews present, the right shape, and not blank.
  for (const [size, aspect] of [["Square 1:1", 1], ["Feed 4:5", 0.8], ["Story 9:16", 9 / 16]] as const) {
    await page.getByRole("radio", { name: size }).click();
    await expect(tiles.locator("img")).toHaveCount(count, { timeout: 60_000 });
    const bad = await tiles.locator("img").evaluateAll(
      (imgs, want) =>
        (imgs as HTMLImageElement[])
          .filter((img) => {
            if (Math.abs(img.naturalWidth / img.naturalHeight - want) > 0.02) return true;
            // A blank preview is one flat colour; real designs vary across the image.
            const c = document.createElement("canvas");
            c.width = c.height = 32;
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0, 32, 32);
            const d = ctx.getImageData(0, 0, 32, 32).data;
            const lum = [];
            for (let i = 0; i < d.length; i += 4) lum.push(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
            const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
            return Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length) < 4;
          })
          .map((img) => img.closest("button")?.getAttribute("aria-label")),
      aspect,
    );
    expect(bad, size).toEqual([]);
  }

  await page.getByRole("button", { name: "Use template: Skin care" }).click();
  await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible();
  // Its photo frames hold sample photos, ready to swap for the user's own.
  await expect(page.getByText("This is a sample photo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use my photo" })).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const png = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of png) chunks.push(chunk as Buffer);
  const file = Buffer.concat(chunks);
  // PNG header: width and height are big-endian at bytes 16 and 20.
  expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([1080, 1920]);
  expect(errors).toEqual([]);
});
