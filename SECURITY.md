# Security policy

## Supported versions

Only the latest release of the desktop app and the current web app get security fixes. Installed
desktop apps update themselves, so please check you're on the
[latest release](https://github.com/harindujayakody/bubble-studio/releases/latest) before reporting.

## Reporting a vulnerability

Please report it privately, not in a public issue:
[Report a vulnerability](https://github.com/harindujayakody/bubble-studio/security/advisories/new)
(Security → Advisories → Report a vulnerability).

Include what an attacker could do, the steps or a sample file (for example a `.bubble` design) that
shows it, and the version and platform you tested. You'll get a reply within 7 days. Once it's fixed
and released, the advisory is published with credit to you, unless you'd rather stay anonymous.

## What's in scope

Bubble Studio has no accounts or servers: editing, rendering and background removal happen on your
device. The parts that matter most:

- The desktop app (Electron): the `app://` file server, the bridge between the page and the app, saved
  files, the background-model download, and updates.
- Opening files made by someone else: designs (`.bubble`), brand kits (`.bubblebrand`), photos, videos,
  subtitles (`.srt`).
- The AI writer key, which must stay on your computer and only be sent to OpenRouter.
- The release workflow that builds and publishes the installers.

Not in scope: problems that need someone who already controls your computer or GitHub account, and
the installers being unsigned (tracked in issue #17).
