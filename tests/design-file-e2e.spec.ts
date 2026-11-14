import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Save a design with a photo and text as a .bubble file, go home, open the file: both come back.
test("save a design as a file and open it again", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click({ timeout: 2_000 });
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo" }).first().click();
  await (await chooser).setFiles("tests/fixtures/photo1.jpg");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Headline", exact: true }).click();
  await page.getByPlaceholder("Type your text").fill("Saved to a file");

  await page.getByRole("button", { name: "Create new" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Save as file/ }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toMatch(/\.bubble$/);
  const path = (await saved.path())!;

  await page.getByTitle("Home: start something new").click();
  await page.getByRole("button", { name: "Start new" }).click();
  await expect(page.getByRole("heading", { name: /What will you make today/i })).toBeVisible();
  await page.locator('input[aria-label="Open a design file"]').setInputFiles({ name: "saved.bubble", mimeType: "application/zip", buffer: readFileSync(path) });

  await expect(page.getByRole("button", { name: /^Text: Saved to a file/ })).toBeVisible();
  // The photo came back too: the middle of the post isn't the blank white sheet.
  await expect
    .poll(() =>
      page.getByRole("img", { name: "Post preview" }).evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext("2d")!.getImageData(Math.round(c.width * 0.2), Math.round(c.height * 0.2), 1, 1).data;
        return d[0] + d[1] + d[2];
      }),
    )
    .toBeLessThan(700);
  expect(errors).toEqual([]);
});
