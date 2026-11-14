import { expect, test } from "@playwright/test";

// OpenRouter is stubbed: no real key or network. The reply wraps the JSON in a code fence and
// over-long text, which the app must still read and trim.
const reply = {
  suggestions: [
    { headline: "Fresh cakes every single morning for you and your whole family", subheading: "Grand opening Saturday", body: "Twenty percent off all cakes", caption: "We are open!", hashtags: ["bakery", "#Colombo"] },
    { headline: "Open now", subheading: "", body: "", caption: "Come by", hashtags: [] },
    { headline: "Sweet start", subheading: "", body: "", caption: "", hashtags: [] },
  ],
};

test("write post text with AI and fill the design", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("bubble-studio:ai", JSON.stringify({ key: "sk-or-test", model: "test/model" })));
  let sent: { model?: string; messages?: { content: string }[] } = {};
  await page.route("https://openrouter.ai/api/v1/chat/completions", async (route) => {
    expect(route.request().headers()["authorization"]).toBe("Bearer sk-or-test");
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { choices: [{ message: { content: "```json\n" + JSON.stringify(reply) + "\n```" } }] } });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(async () => {
    await page.getByRole("button", { name: /Photo post Filters/ }).click();
    await expect(page.getByRole("img", { name: "Post preview" })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Headline", exact: true }).click();
  await page.getByPlaceholder("Type your text").fill("Old headline");

  await page.getByRole("textbox", { name: "Describe your post" }).fill("Bakery grand opening");
  await page.getByRole("button", { name: "Write", exact: true }).click();
  const first = page.getByRole("list", { name: "Suggestions" }).getByRole("listitem").first();
  // Headline clipped to the 10-word limit.
  await expect(first.getByText("Fresh cakes every single morning for you and your whole", { exact: true })).toBeVisible();
  expect(sent.model).toBe("test/model");
  expect(sent.messages?.[1].content).toContain('"Old headline"');

  await first.getByRole("button", { name: "Use this" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const layers = page.getByRole("list", { name: "Layers" });
  await expect(layers.getByText("Fresh cakes every single morning for you and your whole", { exact: true })).toBeVisible();
  await expect(layers.getByText("Grand opening Saturday", { exact: true })).toBeVisible();
  await expect(layers.getByText("Twenty percent off all cakes", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
