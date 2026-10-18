# Bubble Studio

A Canva-style creator for Facebook posts and reels that runs entirely in the browser. Photos, videos and music never leave your computer.

## What it does

- **Photo posts** at 1:1, 3:4, 16:9 or 9:16: filters, adjustments, crop and reposition, text, stickers, emoji, icons, blur or pixelate areas, and a layers list. Export JPG or PNG.
- **Video reels** at 9:16: trim the clip, set when each text or sticker appears on a timeline, mix the original sound with background music, and export MP4.
- **Text** in English and Sinhala Google Fonts, with outlines, background fills and ready-made Sinhala phrases.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Add your own stickers and music

Drop PNGs into `public/custom_icons` and audio files into `public/music`. They appear in the editor automatically (after a rebuild for a deployed site). Music files named like `audio_01.mp3` are listed as "Track 01".

## Built with

Next.js, Tailwind CSS, shadcn/ui (Base UI) and Lucide icons. Design context lives in `PRODUCT.md` and `DESIGN.md`.

## Desktop app (Windows .exe)

Bubble Studio also ships as a Windows desktop app built with Electron. It works offline (fonts, stickers and music are bundled) and updates itself.

```bash
npm run desktop:dev    # build and open the desktop app
npm run desktop:dist   # build the installer into dist-desktop/
```

### Automatic updates

Every push to `main` runs `.github/workflows/desktop-release.yml`, which builds the installer with a new version number (`0.2.<run>`). Installed apps check for a newer version a few seconds after starting and every four hours, download it in the background, and offer **Restart now**. You can also check from the version menu in the top bar.

The source repo is private, so installers are published to a separate public repo. One-time setup:

1. Create the public repo `harindujayakody/bubble-studio-releases` (it can stay empty).
2. Create a fine-grained GitHub token with **Contents: Read and write** on that repo only.
3. Add it to this repo under **Settings → Secrets and variables → Actions** as `RELEASES_TOKEN`.

Until the secret exists, each run still builds the installer and attaches it to the workflow run under **Actions**.

The installer isn't code-signed, so Windows SmartScreen shows a warning on first run (**More info → Run anyway**). A code-signing certificate removes it.
