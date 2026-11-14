import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { appVersion, baseVersion } from "../scripts/app-version.mjs";

// One version for web and desktop: VERSION holds major.minor; the desktop package (whose patch the
// release workflow sets) must start with it, so local installer builds don't drift.
test("versions agree", () => {
  const base = baseVersion();
  expect(base).toMatch(/^\d+\.\d+$/);
  expect(appVersion()).toMatch(new RegExp(`^${base.replace(".", "\\.")}\\.\\d+$`));
  const desktop = JSON.parse(readFileSync("desktop/package.json", "utf8")).version;
  expect(desktop.startsWith(`${base}.`), `desktop/package.json is ${desktop}; set it to ${base}.0`).toBe(true);
  expect(JSON.parse(readFileSync("package.json", "utf8")).version).toBeUndefined();
});
