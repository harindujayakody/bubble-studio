import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // The dev server compiles on first visit, which can take a while.
  timeout: 120_000,
  use: { baseURL: "http://localhost:3000", browserName: "chromium" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
