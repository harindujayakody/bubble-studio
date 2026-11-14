import type { Assets } from "./render";
import type { PostState } from "./types";

/**
 * Sample photos for template frames, bundled in /public/samples (see CREDITS.md there). A frame
 * shows one through a `sample:<name>` photo id; the user replaces it with their own photo.
 */
export const isSample = (id: string | null | undefined): id is string => !!id && id.startsWith("sample:");
export const sampleSrc = (id: string) => `/samples/${id.slice("sample:".length)}.webp`;

const cache = new Map<string, Promise<HTMLImageElement | null>>();

function load(id: string) {
  let p = cache.get(id);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // a missing sample just leaves the frame empty
      img.src = sampleSrc(id);
    });
    cache.set(id, p);
  }
  return p;
}

/** The sample photos a design's frames use, ready to draw. */
export async function loadSamples(state: Pick<PostState, "stickers">): Promise<Assets> {
  const ids = [...new Set(state.stickers.map((s) => s.photo).filter(isSample))];
  const out: Assets = {};
  for (const id of ids) {
    const img = await load(id);
    if (img) out[id] = img;
  }
  return out;
}
