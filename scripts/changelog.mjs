// Changelog from changelog.json (the single source).
//   node scripts/changelog.mjs              rewrite CHANGELOG.md
//   node scripts/changelog.mjs --notes 1.3  print release notes for version 1.3 (used by CI)
import { readFileSync, writeFileSync } from "node:fs";

const { releases } = JSON.parse(readFileSync("changelog.json", "utf8"));
const NL = "\n";
const section = (label, items) => (items?.length ? `### ${label}${NL}${NL}${items.map((i) => `- ${i}`).join(NL)}${NL}` : "");
const body = (r) =>
  [`**${r.title}**${NL}`, section("Added", r.added), section("Improved", r.improved), section("Fixed", r.fixed)].filter(Boolean).join(NL);
const entry = (r) => `## ${r.version} · ${r.date}${NL}${NL}${body(r)}`;

const i = process.argv.indexOf("--notes");
if (i > 0) {
  const want = process.argv[i + 1];
  process.stdout.write(body(releases.find((x) => x.version === want) ?? releases[0]));
} else {
  const intro = [
    "# Changelog",
    "",
    "All notable changes to Bubble Studio. The web app and the desktop app always have the same",
    "version: `VERSION` (major.minor) plus the number of commits since it changed, so `1.3.0`,",
    "`1.3.1`… Each patch release is published on [GitHub Releases](https://github.com/harindujayakody/bubble-studio/releases).",
    "",
    "This file is generated from `changelog.json` with `npm run changelog`.",
    "",
  ].join(NL);
  writeFileSync("CHANGELOG.md", intro + releases.map(entry).join(NL));
  console.log("CHANGELOG.md written");
}
