"use client";

import { useSyncExternalStore } from "react";

/**
 * A "Shot on …" watermark, like phone cameras add. It is a preference, not part of a design:
 * once switched on it goes on every export (reels, photos or both) until switched off.
 * Kept in localStorage; the logo is shrunk and stored as a small PNG data URL.
 */
export type WatermarkStyle = "shot" | "badge" | "minimal";
export type WatermarkPosition = "bl" | "bc" | "br" | "tl" | "tr";

export type Watermark = {
  on: boolean;
  applyTo: "reels" | "photos" | "both";
  style: WatermarkStyle;
  useLogo: boolean;
  line1: string;
  line2: string;
  logo: string | null;
  position: WatermarkPosition;
  size: number; // 50..200 (%)
  opacity: number; // 20..100
  /** "auto" picks white or black from what is behind the watermark. */
  tone: "auto" | "light" | "dark";
};

export const DEFAULT_WATERMARK: Watermark = {
  on: false,
  applyTo: "reels",
  style: "shot",
  useLogo: false,
  line1: "Shot on Bubble Studio",
  line2: "",
  logo: null,
  position: "bl",
  size: 100,
  opacity: 92,
  tone: "auto",
};

const KEY = "bubble-studio:watermark";
const listeners = new Set<() => void>();
let current: Watermark | null = null;
let logoImg: HTMLImageElement | null = null;
let logoSrc: string | null = null;

function read(): Watermark {
  if (current) return current;
  try {
    current = { ...DEFAULT_WATERMARK, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    current = DEFAULT_WATERMARK;
  }
  return current!;
}

/** The watermark settings, synchronously (render code). */
export function getWatermark(): Watermark {
  return typeof window === "undefined" ? DEFAULT_WATERMARK : read();
}

export function setWatermark(patch: Partial<Watermark>) {
  current = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage full (a very large logo): keep it for this visit.
  }
  listeners.forEach((l) => l());
}

export function useWatermark(): Watermark {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT_WATERMARK,
  );
}

/** Shrink an uploaded logo to at most 360px and keep it as a PNG data URL. */
export async function logoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const k = Math.min(1, 360 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The logo as a ready image; null until it has loaded (the next redraw picks it up). */
function logo(src: string | null): HTMLImageElement | null {
  if (!src) return null;
  if (src !== logoSrc) {
    logoSrc = src;
    logoImg = new Image();
    logoImg.onload = () => listeners.forEach((l) => l());
    logoImg.src = src;
  }
  return logoImg?.complete && logoImg.naturalWidth ? logoImg : null;
}

/** Whether the watermark goes on this kind of post. */
export function watermarkApplies(wm: Watermark, media: "photo" | "video") {
  if (!wm.on || (!wm.line1.trim() && !wm.line2.trim() && !(wm.useLogo && wm.logo))) return false;
  return wm.applyTo === "both" || (wm.applyTo === "reels" ? media === "video" : media === "photo");
}

/** Draw the watermark onto a finished frame of the given size. */
export function drawWatermark(ctx: CanvasRenderingContext2D, wm: Watermark, width: number, height: number) {
  const base = Math.min(width, height) * 0.028 * (wm.size / 100);
  const margin = Math.min(width, height) * 0.045;
  const img = wm.useLogo ? logo(wm.logo) : null;
  const line1 = wm.line1.trim();
  const line2 = wm.line2.trim();

  // Measure the block: [logo] [divider] text.
  const f1 = wm.style === "minimal" ? base * 0.8 : base;
  const f2 = base * 0.62;
  const font1 = `${wm.style === "minimal" ? 500 : 700} ${f1}px Roboto, "Helvetica Neue", Arial, sans-serif`;
  const font2 = `400 ${f2}px Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.save();
  ctx.font = font1;
  ctx.letterSpacing = wm.style === "minimal" ? `${f1 * 0.18}px` : `${f1 * 0.02}px`;
  const text1 = wm.style === "minimal" ? line1.toUpperCase() : line1;
  const w1 = text1 ? ctx.measureText(text1).width : 0;
  ctx.font = font2;
  ctx.letterSpacing = "0px";
  const w2 = line2 && wm.style !== "minimal" ? ctx.measureText(line2).width : 0;
  const textW = Math.max(w1, w2);
  const textH = (text1 ? f1 * 1.15 : 0) + (w2 ? f2 * 1.3 : 0);
  const logoH = img ? (wm.style === "minimal" ? f1 * 1.4 : Math.max(textH, base * 1.6)) : 0;
  const logoW = img ? (img.naturalWidth / img.naturalHeight) * logoH : 0;
  const gapX = img && textW ? base * 0.7 : 0;
  const divider = img && textW && wm.style !== "minimal" ? Math.max(1, base * 0.06) : 0;
  const padX = wm.style === "badge" ? base * 0.8 : 0;
  const padY = wm.style === "badge" ? base * 0.55 : 0;
  const blockW = logoW + gapX * (divider ? 2 : 1) + divider + textW + padX * 2;
  const blockH = Math.max(logoH, textH) + padY * 2;

  const x =
    wm.position === "bl" || wm.position === "tl"
      ? margin
      : wm.position === "bc"
        ? (width - blockW) / 2
        : width - margin - blockW;
  const y = wm.position.startsWith("t") ? margin : height - margin - blockH;

  // Auto: white on dark pictures, black on light ones, judged from the area it covers.
  let tone: "light" | "dark" = wm.tone === "dark" ? "dark" : "light";
  if (wm.tone === "auto") {
    try {
      const sx = Math.max(0, Math.floor(x));
      const sy = Math.max(0, Math.floor(y));
      const data = ctx.getImageData(sx, sy, Math.max(1, Math.min(width - sx, Math.ceil(blockW))), Math.max(1, Math.min(height - sy, Math.ceil(blockH)))).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 16) {
        sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        n++;
      }
      tone = n && sum / n > 150 && wm.style !== "badge" ? "dark" : "light";
    } catch {
      tone = "light";
    }
  }
  const ink = tone === "light" ? "#ffffff" : "#111111";
  const soft = tone === "light" ? "rgba(255,255,255,0.78)" : "rgba(17,17,17,0.72)";

  ctx.globalAlpha = wm.opacity / 100;
  if (wm.style === "badge") {
    ctx.fillStyle = tone === "light" ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.roundRect(x, y, blockW, blockH, blockH / 2);
    ctx.fill();
  } else {
    // A soft shadow keeps light text readable on bright footage.
    ctx.shadowColor = tone === "light" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)";
    ctx.shadowBlur = base * 0.5;
  }

  let cx = x + padX;
  const midY = y + blockH / 2;
  if (img) {
    ctx.drawImage(img, cx, midY - logoH / 2, logoW, logoH);
    cx += logoW + gapX;
  }
  if (divider) {
    ctx.fillStyle = soft;
    ctx.fillRect(cx, midY - Math.max(textH, logoH) * 0.42, divider, Math.max(textH, logoH) * 0.84);
    cx += divider + gapX;
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let ty = midY - textH / 2;
  if (text1) {
    ctx.font = font1;
    ctx.letterSpacing = wm.style === "minimal" ? `${f1 * 0.18}px` : `${f1 * 0.02}px`;
    ctx.fillStyle = ink;
    ctx.fillText(text1, cx, ty + (f1 * 1.15) / 2);
    ty += f1 * 1.15;
  }
  if (w2) {
    ctx.font = font2;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = soft;
    ctx.fillText(line2, cx, ty + (f2 * 1.3) / 2);
  }
  ctx.restore();
}

/** Load the watermark's font before an export draws it. */
export async function ensureWatermarkFont() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load("700 32px Roboto"),
    document.fonts.load("500 32px Roboto"),
    document.fonts.load("400 32px Roboto"),
  ]).catch(() => {});
}
