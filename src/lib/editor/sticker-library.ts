import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import type { LibrarySticker } from "./stickers";

export type LibraryTrack = { id: string; name: string; src: string };

function readFolder(folder: string, pattern: RegExp) {
  try {
    const collator = new Intl.Collator("en", { numeric: true });
    return readdirSync(path.join(process.cwd(), "public", folder))
      .filter((f) => pattern.test(f))
      .sort((a, b) => collator.compare(a, b));
  } catch {
    return [];
  }
}

/** Every image in /public/custom_icons, in natural order (1, 01b, 2, 02b ... 10, 10b, 11). */
export function readStickerLibrary(): LibrarySticker[] {
  return readFolder("custom_icons", /\.(png|webp|jpe?g|gif|avif)$/i).map((file) => ({
    id: `custom:${file}`,
    src: `/custom_icons/${encodeURIComponent(file)}`,
  }));
}

/** Every track in /public/music. "audio_01.mp3" is shown as "Track 01". */
export function readMusicLibrary(): LibraryTrack[] {
  return readFolder("music", /\.(mp3|m4a|aac|wav|ogg|opus|webm)$/i).map((file) => {
    const base = file.replace(/\.[^.]+$/, "");
    const numbered = /^(?:audio|track|music)[ _-]*(\d+)$/i.exec(base);
    const name = numbered
      ? `Track ${numbered[1]}`
      : base.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const src = `/music/${encodeURIComponent(file)}`;
    return { id: src, name, src };
  });
}
