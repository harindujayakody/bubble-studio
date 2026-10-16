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
