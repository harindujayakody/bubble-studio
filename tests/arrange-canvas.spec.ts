import { expect, test, type Page } from "@playwright/test";

const rectOf = async (page: Page, name: RegExp) => (await page.getByRole("button", { name }).first().boundingBox())!;

test("select several layers, align, group, lock, duplicate and snap", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click({ timeout: 2_000 });
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Headline", exact: true }).click();
  await page.getByRole("button", { name: "Small text", exact: true }).click();
  const head = /^Text: Grand opening/;
  const small = /^Text: Add your details/;
  await page.keyboard.press("Escape");

  // Shift-click two layers: the arrange bar shows for both.
  await page.getByRole("button", { name: head }).click();
  await page.getByRole("button", { name: small }).click({ modifiers: ["Shift"] });
  const bar = page.getByRole("toolbar", { name: "Arrange 2 layers" });
  await expect(bar).toBeVisible();

  // Align left: the two left edges meet.
  await bar.getByRole("button", { name: "Align left" }).click();
  await expect.poll(async () => Math.abs((await rectOf(page, head)).x - (await rectOf(page, small)).x)).toBeLessThan(2);

  // Group: clicking one later selects both.
  await bar.getByRole("button", { name: "Group" }).click();
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
  await page.getByRole("button", { name: small }).click();
  await expect(bar).toBeVisible();

  // Lock: dragging the selection doesn't move the layers.
  await bar.getByRole("button", { name: "Lock" }).click();
  const before = await rectOf(page, head);
  const box = (await page.getByRole("group", { name: /2 layers selected/ }).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  expect((await rectOf(page, head)).x).toBeCloseTo(before.x, 0);
  await bar.getByRole("button", { name: "Unlock" }).click();
  await bar.getByRole("button", { name: "Ungroup" }).click();

  // A selection box over both selects both again.
  await page.keyboard.press("Escape");
  const sheet = (await page.getByRole("img", { name: "Post preview" }).boundingBox())!;
  await page.mouse.move(sheet.x + 4, sheet.y + 4);
  await page.mouse.down();
  await page.mouse.move(sheet.x + sheet.width - 4, sheet.y + sheet.height - 4, { steps: 6 });
  await page.mouse.up();
  await expect(bar).toBeVisible();

  // Ctrl+D duplicates the selection; Ctrl+C / Ctrl+V copy and paste both layers at once.
  await page.keyboard.press("Control+d");
  await page.keyboard.press("Control+c");
  await expect(page.getByText("2 layers copied")).toBeVisible();
  await page.keyboard.press("Control+v");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const layers = page.getByRole("list", { name: "Layers" });
  await expect(layers.getByRole("button", { name: "Grand opening", exact: true })).toHaveCount(3);
  await expect(layers.getByRole("button", { name: "Add your details here", exact: true })).toHaveCount(3);
  await page.keyboard.press("Escape");

  // Smart guides: dragging one layer near the centre shows a guide line.
  await page.keyboard.press("Escape");
  const one = await rectOf(page, small);
  await page.mouse.move(one.x + one.width / 2, one.y + one.height / 2);
  await page.mouse.down();
  await page.mouse.move(sheet.x + sheet.width / 2 + 2, one.y + one.height / 2 + 30, { steps: 8 });
  // Visible (not just present): a guide is drawn in colour at the snapped line.
  const guide = page.locator("[data-guide]").first();
  await expect(guide).toBeVisible();
  expect(await guide.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 61, 154)");
  await page.mouse.up();
  expect(errors).toEqual([]);
});
