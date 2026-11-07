import type { Sticker } from "./types";

/**
 * Freehand drawing layers. Strokes are stored relative to the layer's own box (0..1), so a
 * drawing can be moved and resized like any sticker. While drawing, strokes are handled in
 * post coordinates (fractions of the post) and the box is refitted after every point.
 */
export type Brush = "pen" | "marker" | "highlighter";
export type Stroke = { pts: number[]; color: string; brush: Brush; width: number };
/** A stroke in post fractions; `width` in post px at 1080. */
export type PostStroke = { pts: number[]; color: string; brush: Brush; width: number };

/** The drawing's strokes back in post fractions. */
export function toPost(s: Sticker, postW: number, postH: number): PostStroke[] {
  const w = s.size / postW;
  const h = s.size / (s.aspect ?? 1) / postH;
  return (s.strokes ?? []).map((st) => ({
    ...st,
    width: st.width * s.size,
    pts: st.pts.map((v, i) => (i % 2 === 0 ? s.x + (v - 0.5) * w : s.y + (v - 0.5) * h)),
  }));
}

/** Fit a drawing layer's box around its strokes. */
export function fromPost(strokes: PostStroke[], postW: number, postH: number): Pick<Sticker, "x" | "y" | "size" | "aspect" | "strokes"> {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const st of strokes) {
    const pad = st.width / 2;
    for (let i = 0; i < st.pts.length; i += 2) {
      minX = Math.min(minX, st.pts[i] - pad / postW);
      maxX = Math.max(maxX, st.pts[i] + pad / postW);
      minY = Math.min(minY, st.pts[i + 1] - pad / postH);
      maxY = Math.max(maxY, st.pts[i + 1] + pad / postH);
    }
  }
  const w = Math.max(maxX - minX, 4 / postW);
  const h = Math.max(maxY - minY, 4 / postH);
  const size = w * postW;
  return {
    x: minX + w / 2,
    y: minY + h / 2,
    size,
    aspect: size / (h * postH),
    strokes: strokes.map((st) => ({
      ...st,
      width: st.width / size,
      pts: st.pts.map((v, i) => (i % 2 === 0 ? (v - minX) / w : (v - minY) / h)),
    })),
  };
}

/** Draw a drawing layer centred on the current origin at w × h canvas px. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const st of strokes) {
    const p = st.pts;
    if (p.length < 2) continue;
    const X = (i: number) => (p[i] - 0.5) * w;
    const Y = (i: number) => (p[i + 1] - 0.5) * h;
    ctx.save();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = Math.max(0.5, st.width * w);
    if (st.brush === "marker") ctx.globalAlpha *= 0.8;
    if (st.brush === "highlighter") {
      ctx.globalAlpha *= 0.42;
      ctx.lineCap = "butt";
    }
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    if (p.length === 2) ctx.lineTo(X(0) + 0.01, Y(0));
    // Smooth through the midpoints between samples.
    for (let i = 2; i < p.length - 2; i += 2) {
      ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 2)) / 2, (Y(i) + Y(i + 2)) / 2);
    }
    if (p.length > 2) ctx.lineTo(X(p.length - 2), Y(p.length - 2));
    ctx.stroke();
    ctx.restore();
  }
}

/** Which strokes pass within `r` post px of a point (x, y in post fractions). */
export function strokesHit(strokes: PostStroke[], x: number, y: number, r: number, postW: number, postH: number) {
  return strokes.map((st) => {
    for (let i = 0; i < st.pts.length; i += 2) {
      if (Math.hypot((st.pts[i] - x) * postW, (st.pts[i + 1] - y) * postH) < r + st.width / 2) return true;
    }
    return false;
  });
}
