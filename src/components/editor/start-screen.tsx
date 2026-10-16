"use client";

import { POST_SIZES, type PostSizeId } from "@/lib/editor/types";

const ORDER: PostSizeId[] = ["square", "portrait", "landscape", "story"];

/** First screen: choose the post's size before anything else. */
export function StartScreen({ onPick }: { onPick: (size: PostSizeId) => void }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-10 md:justify-center md:py-12">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance text-ink md:text-[28px]">
          What size is your post?
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-pretty text-ink-soft">
          Pick a shape for Facebook. You can switch later from the top bar, and your text and stickers move with it.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {ORDER.map((id) => {
            const s = POST_SIZES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className="group flex flex-col rounded-lg border border-rule bg-sheet p-4 text-left outline-none transition-[border-color,box-shadow] hover:border-magenta/60 hover:shadow-[0_8px_24px_-12px_oklch(0.2_0.02_260/0.35)] focus-visible:ring-2 focus-visible:ring-cyan"
              >
                <span className="grid h-36 place-items-center rounded-md bg-table/60">
                  <SizePreview w={s.w} h={s.h} />
                </span>
                <span className="mt-4 text-[15px] font-semibold text-ink">{s.label}</span>
                <span className="mt-0.5 flex items-baseline gap-2 font-mono text-xs text-ink-soft tabular">
                  <span className="font-semibold text-magenta-ink">{s.ratio}</span>
                  {s.w} × {s.h}
                </span>
                <span className="mt-2 text-[13px] text-pretty text-ink-soft">{s.use}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-ink-soft">Everything stays in your browser. Nothing is uploaded.</p>
      </div>
    </main>
  );
}

/** The sheet at its ratio, framed by crop marks like the editor's canvas. */
export function SizePreview({ w, h, max = 96 }: { w: number; h: number; max?: number }) {
  const scale = max / Math.max(w, h);
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  const off = 4;
  const len = 8;
  const corners = [
    [0, 0, -1, -1],
    [pw, 0, 1, -1],
    [0, ph, -1, 1],
    [pw, ph, 1, 1],
  ];
  return (
    <svg width={pw + 28} height={ph + 28} viewBox={`-14 -14 ${pw + 28} ${ph + 28}`} aria-hidden className="overflow-visible">
      <rect
        width={pw}
        height={ph}
        className="fill-sheet transition-[fill] group-hover:fill-magenta-wash"
        style={{ filter: "drop-shadow(0 2px 4px oklch(0.2 0.02 260 / 0.18))" }}
      />
      {corners.map(([x, y, sx, sy], i) => (
        <g key={i} transform={`translate(${x} ${y})`} stroke="var(--ink)" strokeWidth={1}>
          <line x1={sx * off} y1={0} x2={sx * (off + len)} y2={0} />
          <line x1={0} y1={sy * off} x2={0} y2={sy * (off + len)} />
        </g>
      ))}
    </svg>
  );
}
