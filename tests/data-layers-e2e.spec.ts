import { expect, test } from "@playwright/test";

test("add charts, a table and a QR code, edit them, export", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click({ timeout: 2_000 });
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Use a colour" }).click();
  await page.getByRole("button", { name: "Elements", exact: true }).click();

  // After each add the panel shows the categories again; open Charts until the tile is there.
  for (const name of ["Bar chart", "Pie chart", "Table", "QR code"]) {
    const tile = page.getByRole("button", { name, exact: true });
    await expect(async () => {
      const tab = page.getByRole("button", { name: "Charts", exact: true });
      if (await tab.isVisible()) await tab.click();
      await expect(tile).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await tile.click();
  }
  // The QR code is selected: point it at a WhatsApp number.
  await page.getByRole("radio", { name: "WhatsApp" }).click();
  await page.getByRole("textbox", { name: "QR code content" }).fill("94 77 123 4567");
  await expect(page.getByText("Include the country code")).toBeVisible();

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const layers = page.getByRole("list", { name: "Layers" });
  for (const name of ["bar chart", "pie chart", "Table", "QR code"]) await expect(layers.getByRole("button", { name, exact: true })).toBeVisible();
  // They start centred and overlap, so pick the bar chart from the layers list and edit its numbers.
  await layers.getByRole("button", { name: "bar chart", exact: true }).click();
  await page.getByLabel("One per line: label, number").fill("Jan, 5\nFeb, 9\nMar, 14");
  if (process.env.OUT) await page.getByRole("img", { name: "Post preview" }).screenshot({ path: process.env.OUT });

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  expect(errors).toEqual([]);
});
