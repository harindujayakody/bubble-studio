import { expect, test } from "@playwright/test";

test("switch the interface to Sinhala and back", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(async () => {
    await page.getByRole("button", { name: "Switch the interface to Sinhala" }).click({ timeout: 2_000 });
    await expect(page.getByRole("heading", { name: "අද ඔබ නිර්මාණය කරන්නේ කුමක්ද?" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "si");
  await expect(page.getByRole("heading", { name: "සැකිල්ලකින් අරඹන්න" })).toBeVisible();

  // The choice is remembered.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "අද ඔබ නිර්මාණය කරන්නේ කුමක්ද?" })).toBeVisible();

  // The editor follows: tool rail and panel titles.
  await page.getByRole("button", { name: /ඡායාරූප පෝස්ට්/ }).first().click();
  await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible();
  await page.getByRole("button", { name: "පෙළ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "පෙළ එක් කරන්න" })).toBeVisible();

  // Back to English from Settings.
  // Settings by its shortcut: in development the Next.js badge covers the bottom of the rail.
  await page.keyboard.press("s");
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Language" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});
