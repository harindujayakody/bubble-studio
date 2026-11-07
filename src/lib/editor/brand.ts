"use client";

import { useSyncExternalStore } from "react";

/**
 * The business's brand kit: logos, colours and fonts, kept in this browser (or the desktop app)
 * and offered first everywhere: colour pickers, the font list, new text, Elements, watermark.
 * shortcut: logos live in localStorage as small PNG data URLs (max 4, 512 px), move to IndexedDB if people need more.
 */
export type BrandKit = {
  name: string;
  logos: string[];
  colors: string[];
  headingFont: string | null;
  bodyFont: string | null;
};

export const EMPTY_BRAND: BrandKit = { name: "", logos: [], colors: [], headingFont: null, bodyFont: null };
export const MAX_LOGOS = 4;
export const MAX_COLORS = 10;

const KEY = "bubble-studio:brand";
const listeners = new Set<() => void>();
let current: BrandKit | null = null;

function read(): BrandKit {
  if (current) return current;
  try {
    current = { ...EMPTY_BRAND, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    current = EMPTY_BRAND;
  }
  return current!;
}

export function getBrand(): BrandKit {
  return typeof window === "undefined" ? EMPTY_BRAND : read();
}

/** Save changes. Returns false when storage is full (too many large logos). */
export function setBrand(patch: Partial<BrandKit>): boolean {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  current = next;
  listeners.forEach((l) => l());
  return true;
}

export function useBrand(): BrandKit {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY_BRAND,
  );
}

/** Shrink an uploaded logo to at most 512 px and keep it as a PNG data URL. */
export async function brandLogoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const k = Math.min(1, 512 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The kit as a file to keep or move to another computer. */
export function brandFile(kit: BrandKit) {
  return new Blob([JSON.stringify({ type: "bubble-studio-brand", version: 1, ...kit })], { type: "application/json" });
}

/** Read a brand kit file; throws when it isn't one. */
export async function readBrandFile(file: File): Promise<BrandKit> {
  const data = JSON.parse(await file.text());
  if (data?.type !== "bubble-studio-brand") throw new Error("That isn't a Bubble Studio brand kit file.");
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    name: typeof data.name === "string" ? data.name : "",
    // Only image data URLs, so a file can't point the app at outside resources.
    logos: strings(data.logos).filter((l) => l.startsWith("data:image/")).slice(0, MAX_LOGOS),
    colors: strings(data.colors).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, MAX_COLORS),
    headingFont: typeof data.headingFont === "string" ? data.headingFont : null,
    bodyFont: typeof data.bodyFont === "string" ? data.bodyFont : null,
  };
}
