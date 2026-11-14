/**
 * Arranging layers on the post: align, distribute and smart-guide snapping. Boxes are centre and
 * size in fractions of the post (like the renderer's boxes); rotation is ignored, so a rotated
 * layer aligns by its unrotated box.
 */
export type Box = { id: string; cx: number; cy: number; w: number; h: number };
export type Align = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type Move = { id: string; x: number; y: number };

/** The rectangle around several boxes. */
export function bounds(boxes: Box[]) {
  const l = Math.min(...boxes.map((b) => b.cx - b.w / 2));
  const r = Math.max(...boxes.map((b) => b.cx + b.w / 2));
  const t = Math.min(...boxes.map((b) => b.cy - b.h / 2));
  const btm = Math.max(...boxes.map((b) => b.cy + b.h / 2));
  return { l, r, t, b: btm, cx: (l + r) / 2, cy: (t + btm) / 2, w: r - l, h: btm - t };
}

/** Line boxes up with each other, or with the page when there's only one. */
export function align(boxes: Box[], how: Align): Move[] {
  const area = boxes.length > 1 ? bounds(boxes) : { l: 0, r: 1, t: 0, b: 1, cx: 0.5, cy: 0.5 };
  return boxes.map((b) => {
    let { cx: x, cy: y } = b;
    if (how === "left") x = area.l + b.w / 2;
    if (how === "center") x = area.cx;
    if (how === "right") x = area.r - b.w / 2;
    if (how === "top") y = area.t + b.h / 2;
    if (how === "middle") y = area.cy;
    if (how === "bottom") y = area.b - b.h / 2;
    return { id: b.id, x, y };
  });
}

/** Equal gaps between boxes along an axis; the first and last stay where they are. */
export function distribute(boxes: Box[], axis: "x" | "y"): Move[] {
  if (boxes.length < 3) return boxes.map((b) => ({ id: b.id, x: b.cx, y: b.cy }));
  const pos = (b: Box) => (axis === "x" ? b.cx : b.cy);
  const len = (b: Box) => (axis === "x" ? b.w : b.h);
  const sorted = [...boxes].sort((a, b) => pos(a) - pos(b));
  const start = pos(sorted[0]) - len(sorted[0]) / 2;
  const end = pos(sorted[sorted.length - 1]) + len(sorted[sorted.length - 1]) / 2;
  const gap = (end - start - sorted.reduce((s, b) => s + len(b), 0)) / (sorted.length - 1);
  let at = start;
  return sorted.map((b) => {
    const c = at + len(b) / 2;
    at += len(b) + gap;
    return { id: b.id, x: axis === "x" ? c : b.cx, y: axis === "y" ? c : b.cy };
  });
}

/** Safe margin from the post's edges that guides snap to. */
export const MARGIN = 0.05;

export type Gap = { axis: "x" | "y"; from: number; to: number; at: number };
export type Snap = { dx: number; dy: number; xs: number[]; ys: number[]; gaps: Gap[] };

/**
 * Snap a box being dragged to the page (edges, centre, margins) and to other boxes (edges and
 * centres). `threshold` is in fractions per axis. Returns the correction, the guide lines to
 * draw, and the gaps to the nearest box on each side.
 */
export function snap(moving: Box, others: Box[], threshold: { x: number; y: number }): Snap {
  const xs = [0, MARGIN, 0.5, 1 - MARGIN, 1, ...others.flatMap((o) => [o.cx - o.w / 2, o.cx, o.cx + o.w / 2])];
  const ys = [0, MARGIN, 0.5, 1 - MARGIN, 1, ...others.flatMap((o) => [o.cy - o.h / 2, o.cy, o.cy + o.h / 2])];
  const best = (edges: number[], lines: number[], limit: number) => {
    let d = Infinity;
    for (const e of edges) for (const l of lines) if (Math.abs(l - e) < Math.abs(d)) d = l - e;
    return Math.abs(d) <= limit ? d : 0;
  };
  const mx = [moving.cx - moving.w / 2, moving.cx, moving.cx + moving.w / 2];
  const my = [moving.cy - moving.h / 2, moving.cy, moving.cy + moving.h / 2];
  const dx = best(mx, xs, threshold.x);
  const dy = best(my, ys, threshold.y);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const sx = mx.map((v) => v + dx);
  const sy = my.map((v) => v + dy);
  const out: Snap = {
    dx,
    dy,
    xs: dx || xs.some((l) => sx.some((v) => near(v, l))) ? [...new Set(xs.filter((l) => sx.some((v) => near(v, l))))] : [],
    ys: dy || ys.some((l) => sy.some((v) => near(v, l))) ? [...new Set(ys.filter((l) => sy.some((v) => near(v, l))))] : [],
    gaps: [],
  };

  // Gaps to the nearest box on the left/right (overlapping vertically) and above/below.
  const m = { l: sx[0], r: sx[2], t: sy[0], b: sy[2] };
  const edgesOf = (o: Box) => ({ l: o.cx - o.w / 2, r: o.cx + o.w / 2, t: o.cy - o.h / 2, b: o.cy + o.h / 2 });
  let left: Gap | null = null, right: Gap | null = null, up: Gap | null = null, down: Gap | null = null;
  for (const o of others.map(edgesOf)) {
    const rowOverlap = o.t < m.b && o.b > m.t;
    const colOverlap = o.l < m.r && o.r > m.l;
    const at = (Math.max(o.t, m.t) + Math.min(o.b, m.b)) / 2;
    const atX = (Math.max(o.l, m.l) + Math.min(o.r, m.r)) / 2;
    if (rowOverlap && o.r <= m.l && (!left || o.r > left.from)) left = { axis: "x", from: o.r, to: m.l, at };
    if (rowOverlap && o.l >= m.r && (!right || o.l < right.to)) right = { axis: "x", from: m.r, to: o.l, at };
    if (colOverlap && o.b <= m.t && (!up || o.b > up.from)) up = { axis: "y", from: o.b, to: m.t, at: atX };
    if (colOverlap && o.t >= m.b && (!down || o.t < down.to)) down = { axis: "y", from: m.b, to: o.t, at: atX };
  }
  out.gaps = [left, right, up, down].filter((g): g is Gap => !!g && g.to - g.from > 0.002);
  return out;
}

/** Scale boxes' positions about a point by `k` (their sizes are scaled by the caller). */
export function scaleAbout(boxes: Box[], k: number, cx: number, cy: number): Move[] {
  return boxes.map((b) => ({ id: b.id, x: cx + (b.cx - cx) * k, y: cy + (b.cy - cy) * k }));
}
