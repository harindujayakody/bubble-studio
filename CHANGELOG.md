# Changelog

All notable changes to Bubble Studio. The web app and the desktop app always have the same
version: `VERSION` (major.minor) plus the number of commits since it changed, so `1.3.0`,
`1.3.1`… Each patch release is published on [GitHub Releases](https://github.com/harindujayakody/bubble-studio/releases).

This file is generated from `changelog.json` with `npm run changelog`.
## 1.3 · 2026-11-08

**Templates, brand kit and pro design tools**

### Added

- Templates library: 31 templates in 7 categories (grand opening, sale, new arrival, food, opening hours, thank you, festivals) in English and Sinhala, with a switch to restyle them with your brand
- Save your own designs as templates (New → Save as template)
- Brand kit (Settings): logos, brand colours and heading/body fonts, offered first everywhere; export and import as a .bubblebrand file
- Text effects: curve, glow, neon, hollow, gradient and echo
- Photo frames: 12 shapes to put a photo in, with zoom, move and border
- Draw tool: pen, marker, highlighter and eraser
- Magic resize: see the design at 1:1, 4:5, 3:4, 9:16 and 16:9, open one or export them all as a ZIP
- Background remover that runs on your computer (Photo → Remove background, also for image stickers), with Restore
- Text animations for reels: fade, pop, slide up, typewriter, wobble, bounce and pulse, with speed
- Bulk variations: random gentle look, nudged text, one text line per item, and random background music for bulk reels
- Edit each photo or clip separately in bulk edit; drag and drop files onto the Bulk panel
- Enhance filter (close to the original, a little crisper) and a 4:5 size (1080 × 1350)
- What's new in Settings, and this changelog

### Improved

- Copy and paste text and image layers between designs with Ctrl/Cmd+C and Ctrl/Cmd+V
- Twenty additional offline fonts and a searchable, grouped font picker
- Sixteen subtle filters in Natural, Food, Product and Portrait groups
- Background removal is available in the offline desktop app; the web app no longer ships its model and runtime
- Every export gets a fresh file name, so saves never overwrite each other
- The save folder is asked once, then exports save straight into it (change it in Settings)
- New music tracks start at the music volume you used last

### Fixed

- The previous clip's sound no longer keeps playing after switching clips

## 1.2 · 2026-10-19

**Elements, shapes, collages and watermark**

### Added

- Elements browser with Stickers, Shapes (31, with fill, border, radius and stretch), Animated stickers, GIFs, Grids (collages), Emoji and Uploads
- Watermark: "Shot on…", badge or minimal, with text and/or logo, auto colour, for reels, photos or both
- 15 new filters inspired by Instagram, TikTok and Snapchat, organised by group
- Custom sizes on the start page and Resize to custom size
- More emoji (popular, hands, hearts, faces, celebrate, shop and food)
- More Sinhala fonts: Google Sans, Maname and extra Noto Sans Sinhala weights

### Improved

- Redesigned colour picker with brand-style swatches, custom colour and palettes
- Consistent buttons, toggles, inputs and sliders in light and dark
- The updater shows the latest published version next to the installed one

### Fixed

- Header controls stayed dark in light mode

## 1.1 · 2026-10-19

**New look, recent designs, merge and audio tools**

### Added

- Canva-style redesign with light and dark mode (instant switch, follows the system)
- Continue designing: your last 5 designs on the start page
- Merge videos and Extract audio (MP3, M4A, WAV); use a video's sound as reel music
- Export folder with Reels, Photos, Audios and Merged Videos subfolders
- 16:9 landscape reels; drag layers to reorder them

### Improved

- Notifications in the bottom-right corner
- Version numbers are the same on web and desktop

## 1.0 · 2026-10-19

**First stable release**

### Added

- Photo posts with filters, adjustments, crop, text, stickers, blur and layers; JPG/PNG export
- Video reels with timeline, background music and fast MP4 export
- Bulk editing for photos and reels
- Windows and Mac desktop apps that update themselves
- Sinhala fonts and saved phrases, auto-save, colour palettes, MIT licence
