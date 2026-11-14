// Publish a release: tag the current commit with its version (v1.3.N) and push the tag. The
// release workflow builds the Windows and Mac installers for tags and publishes them.
// Usage: npm run release
import { execSync } from "node:child_process";
import { appVersion } from "./app-version.mjs";

const run = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") throw new Error(`Releases come from main (you're on ${branch}).`);
if (run("git status --porcelain --untracked-files=no")) throw new Error("Commit or stash your changes first.");
run("git fetch origin main --quiet");
if (run("git rev-parse HEAD") !== run("git rev-parse origin/main")) throw new Error("Push main first, so the release matches GitHub.");

const tag = `v${appVersion()}`;
if (run(`git tag --list ${tag}`)) throw new Error(`${tag} already exists. Make a new commit to release again.`);
run(`git tag ${tag}`);
run(`git push origin ${tag}`);
console.log(`Released ${tag}: GitHub is building the installers now.`);
