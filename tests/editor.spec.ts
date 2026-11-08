import { expect, test } from "@playwright/test";

test("create a post, copy a text layer, and export a PNG", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Wait for the app to hydrate; clicks before that are lost (slow in dev).
  await page.goto("/", { waitUntil: "networkidle" });
  // Retry until the click lands after hydration and the editor opens.
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click();
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Headline", exact: true }).click();
  const text = page.locator("textarea").first();
  await text.fill("Open today");
  await text.blur();
  await page.keyboard.press("Control+c");
  await expect(page.getByText("Layer copied")).toBeVisible();
  await page.keyboard.press("Control+v");
  await expect(page.locator("textarea").first()).toHaveValue("Open today");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(page.getByRole("list", { name: "Layers" }).getByText("Open today", { exact: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  expect(errors).toEqual([]);
});
