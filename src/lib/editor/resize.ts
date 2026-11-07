import { postDims } from "./render";
import type { PostSizeId, PostState } from "./types";

/** Space kept clear at the edges after resizing, as a share of the post. */
const MARGIN = 0.05;
const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/**
 * The same design at another size. Layers keep their relative positions; text and stickers
 * scale by how much the new size can hold (so nothing overflows a shorter or narrower post),
 * and anything that would cross the edge margin is pulled back inside. The photo re-fills the
 * new shape from its centre.
 */
export function resizeDesign(state: PostState, size: PostSizeId, canvas?: { w: number; h: number } | null): PostState {
  const from = postDims(state);
  const next: PostState = { ...state, size, canvas: size === "custom" ? (canvas ?? state.canvas ?? null) : state.canvas, crop: null };
  const to = postDims(next);
  // Text and sticker sizes are post px: shrink when the new shape is tighter, never grow.
  const k = Math.min(1, to.w / from.w, to.h / from.h);

  return {
    ...next,
    texts: state.texts.map((t) => {
      const fontSize = Math.round(t.fontSize * k);
      // Wrap width stays a share of the post, capped so the box fits inside the margins.
      const width = Math.min(t.width, 1 - MARGIN * 2);
      const halfH = (fontSize * t.lineHeight) / 2 / to.h;
      return {
        ...t,
        fontSize,
        width,
        x: clamp(t.x, MARGIN + width / 2, 1 - MARGIN - width / 2),
        y: clamp(t.y, MARGIN + halfH, 1 - MARGIN - halfH),
      };
    }),
    stickers: state.stickers.map((s) => {
      const sizePx = Math.round(s.size * k);
      const halfW = sizePx / 2 / to.w;
      const halfH = sizePx / (s.aspect ?? 1) / 2 / to.h;
      return {
        ...s,
        size: sizePx,
        x: clamp(s.x, MARGIN + halfW, 1 - MARGIN - halfW),
        y: clamp(s.y, MARGIN + halfH, 1 - MARGIN - halfH),
      };
    }),
  };
}

// Self-check: a square design opened as a story keeps its sizes; a story squeezed to a square shrinks.
if (process.env.NODE_ENV === "development") {
  const base = { size: "square", custom: null, canvas: null, texts: [], stickers: [] } as unknown as PostState;
  const t = { fontSize: 100, lineHeight: 1, width: 0.5, x: 0.5, y: 0.5 } as PostState["texts"][number];
  console.assert(resizeDesign({ ...base, texts: [t] }, "story").texts[0].fontSize === 100, "resize: square to story keeps size");
  console.assert(resizeDesign({ ...base, size: "story", texts: [t] }, "square").texts[0].fontSize === 56, "resize: story to square shrinks");
}
