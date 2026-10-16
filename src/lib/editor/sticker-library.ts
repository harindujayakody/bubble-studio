import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import type { LibrarySticker } from "./stickers";

const DIR = path.join(process.cwd(), "public", "custom_icons");
const IMAGE = /\.(png|webp|jpe?g|gif|avif)$/i;

/** Every image in /public/custom_icons, in natural order (1, 01b, 2, 02b ... 10, 10b, 11). */
export function readStickerLibrary(): LibrarySticker[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => IMAGE.test(f));
  } catch {
    return [];
  }
  const collator = new Intl.Collator("en", { numeric: true });
  return files
    .sort((a, b) => collator.compare(a, b))
    .map((file) => ({ id: `custom:${file}`, src: `/custom_icons/${encodeURIComponent(file)}` }));
}
