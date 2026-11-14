import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";

test("make a 3-page carousel, export it as numbered images, and reopen it from a file", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click({ timeout: 2_000 });
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Use a colour" }).click();
  const headline = async (text: string) => {
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: "Headline", exact: true }).click();
    await page.getByPlaceholder("Type your text").fill(text);
  };
  await headline("Page one");

  await page.getByRole("button", { name: "Add page (carousel)" }).click();
  const pages = page.getByRole("list", { name: "Pages" });
  await expect(pages.getByRole("button", { name: /^Page \d$/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^Text: Page one/ })).toHaveCount(0);
  await headline("Page two");
  await page.getByRole("button", { name: "Duplicate page" }).click();
  await expect(pages.getByRole("button", { name: /^Page \d$/ })).toHaveCount(3);

  // Back to page 1: its own text.
  await pages.getByRole("button", { name: "Page 1" }).click();
  await expect(page.getByRole("button", { name: /^Text: Page one/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Text: Page two/ })).toHaveCount(0);
  if (process.env.OUT) {
    await page.waitForTimeout(800);
    await page.getByRole("main", { name: "Canvas" }).screenshot({ path: process.env.OUT });
  }

  // Export all pages as numbered images in a ZIP.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all 3 pages (ZIP)" }).click();
  const zip = unzipSync(readFileSync((await (await download).path())!));
  expect(Object.keys(zip).map((n) => n.replace(/^.*-(\d)\.jpg$/, "$1")).sort()).toEqual(["1", "2", "3"]);
  await page.keyboard.press("Escape");

  // A design file keeps all three pages.
  await page.getByRole("button", { name: "Create new" }).click();
  const saved = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Save as file/ }).click();
  const file = readFileSync((await (await saved).path())!);
  await page.getByTitle("Home: start something new").click();
  await page.getByRole("button", { name: "Start new" }).click();
  await page.locator('input[aria-label="Open a design file"]').setInputFiles({ name: "carousel.bubble", mimeType: "application/zip", buffer: file });
  await expect(pages.getByRole("button", { name: /^Page \d$/ })).toHaveCount(3);
  expect(errors).toEqual([]);
});
