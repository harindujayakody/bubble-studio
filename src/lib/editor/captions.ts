import { DEFAULT_FILL, DEFAULT_OUTLINE, type TextLayer, type VideoClip } from "./types";
import { reelAt, reelLength, sourceAt } from "./segments";

/**
 * Captions are ordinary text layers marked `caption`, each shown from `start` to `end` (source
 * seconds, like every reel layer), so the timeline, undo and both exporters already handle them.
 * One style applies to all of them.
 */
export type CaptionStyle = "box" | "outline" | "highlight";
export type Cue = { start: number; end: number; text: string };

export const CAPTION_STYLES: { id: CaptionStyle; label: string; hint: string }[] = [
  { id: "box", label: "Box", hint: "White on a dark box" },
  { id: "outline", label: "Outline", hint: "Bold white with a dark outline" },
  { id: "highlight", label: "Highlight", hint: "Dark on a yellow box" },
];

/** The look of a caption in a style: everything except its words, timing, id and stacking. */
export function captionLook(style: CaptionStyle, sinhala: boolean): Omit<TextLayer, "id" | "text" | "z" | "start" | "end"> {
  const base = {
    x: 0.5,
    y: 0.8,
    fontFamily: sinhala ? "Noto Sans Sinhala" : "Poppins",
    fontWeight: 700,
    fontSize: 54,
    color: "#ffffff",
    align: "center" as const,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.25,
    width: 0.84,
    shadow: false,
    fill: DEFAULT_FILL,
    rotation: 0,
    caption: true,
  };
  if (style === "outline") return { ...base, fontSize: 60, fontWeight: 800, outline: { ...DEFAULT_OUTLINE, on: true, width: 45, color: "#000000" } };
  if (style === "highlight") return { ...base, color: "#111111", fill: { ...DEFAULT_FILL, mode: "lines", color: "#ffe14d", opacity: 100, radius: 25, padding: 35 } };
  return { ...base, fill: { ...DEFAULT_FILL, mode: "lines", color: "#000000", opacity: 70, radius: 25, padding: 35 } };
}

/** Which style a set of captions is using (from the first one). */
export function captionStyleOf(layer: TextLayer | undefined): CaptionStyle {
  if (!layer) return "box";
  if (layer.outline?.on) return "outline";
  return layer.fill.color.toLowerCase() === "#ffe14d" ? "highlight" : "box";
}

const time = (h: string, m: string, s: string, ms: string) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;

/** Cues from an .srt (or .vtt) file. Malformed blocks are skipped. */
export function parseSrt(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.trim().split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const m = lines[i].match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
    const words = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
    if (!m || !words) continue;
    const start = time(m[1], m[2], m[3], m[4]);
    const end = time(m[5], m[6], m[7], m[8]);
    if (end > start) cues.push({ start, end, text: words });
  }
  return cues;
}

const stamp = (t: number) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** An .srt for the finished reel: times follow its cuts and speed. Cues in deleted parts drop out. */
export function buildSrt(cues: Cue[], clip: VideoClip): string {
  return cues
    .map((c) => ({ start: reelAt(clip, c.start), end: reelAt(clip, c.end), text: c.text }))
    .filter((c) => c.end - c.start > 0.05)
    .map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)
    .join("\n");
}

/** One cue per line, spread evenly over the reel's kept parts, longer lines getting more time. */
export function spreadLines(text: string, clip: VideoClip): Cue[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const length = reelLength(clip);
  const weights = lines.map((l) => Math.max(4, l.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let at = 0;
  return lines.map((line, i) => {
    const span = (length * weights[i]) / total;
    const cue = { start: sourceAt(clip, at), end: sourceAt(clip, Math.min(length, at + span) - 0.001), text: line };
    at += span;
    return cue;
  });
}
