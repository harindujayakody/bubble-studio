import type { VideoClip } from "./types";

/**
 * Cuts and speed. A clip keeps one or more parts of its source (in source seconds, in order,
 * inside the trim) and plays them back to back at `speed`. Text and sticker timings stay in
 * source seconds, so anything inside a deleted part goes with it. "Reel time" is the finished
 * reel's clock: 0 at the first kept frame, counting real seconds.
 */
export type Part = { start: number; end: number };

const MIN_PART = 0.2;

export const speedOf = (clip: VideoClip) => clip.speed ?? 1;

/** The parts of the source the reel plays, clipped to the trim. */
export function keptParts(clip: VideoClip): Part[] {
  const parts = (clip.parts ?? [{ start: clip.trimStart, end: clip.trimEnd }])
    .map((p) => ({ start: Math.max(p.start, clip.trimStart), end: Math.min(p.end, clip.trimEnd) }))
    .filter((p) => p.end - p.start > 0.05);
  return parts.length ? parts : [{ start: clip.trimStart, end: Math.max(clip.trimStart + 0.1, clip.trimEnd) }];
}

/** The finished reel's length in seconds. */
export function reelLength(clip: VideoClip) {
  return keptParts(clip).reduce((s, p) => s + p.end - p.start, 0) / speedOf(clip);
}

/** Source time at reel time `t`. */
export function sourceAt(clip: VideoClip, t: number) {
  const parts = keptParts(clip);
  let left = Math.max(0, t) * speedOf(clip);
  for (const p of parts) {
    if (left < p.end - p.start) return p.start + left;
    left -= p.end - p.start;
  }
  return parts[parts.length - 1].end;
}

/** Reel time of a source time; a time in a deleted part counts as the start of the next part. */
export function reelAt(clip: VideoClip, source: number) {
  let done = 0;
  for (const p of keptParts(clip)) {
    if (source < p.start) break;
    if (source < p.end) return (done + source - p.start) / speedOf(clip);
    done += p.end - p.start;
  }
  return done / speedOf(clip);
}

/**
 * Where playback at source time `t` should be: null while inside a part, the next part's start
 * when in a deleted gap (or before the first part), or "end" after the last part.
 */
export function playable(clip: VideoClip, t: number): number | null | "end" {
  for (const p of keptParts(clip)) {
    if (t < p.start - 0.01) return p.start;
    if (t < p.end) return null;
  }
  return "end";
}

/** The parts after splitting at source time `t`, or null when `t` is too close to an edge. */
export function splitAt(clip: VideoClip, t: number): Part[] | null {
  const parts = keptParts(clip);
  const i = parts.findIndex((p) => t - p.start >= MIN_PART && p.end - t >= MIN_PART);
  if (i < 0) return null;
  return [...parts.slice(0, i), { start: parts[i].start, end: t }, { start: t, end: parts[i].end }, ...parts.slice(i + 1)];
}

/** The parts without part `i`; null when it's the only one left. */
export function removePart(clip: VideoClip, i: number): Part[] | null {
  const parts = keptParts(clip);
  return parts.length > 1 ? parts.filter((_, j) => j !== i) : null;
}
