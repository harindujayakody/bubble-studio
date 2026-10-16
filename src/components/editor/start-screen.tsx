"use client";

import { useState } from "react";
import { ArrowLeft, Film, ImageIcon } from "lucide-react";
import { POST_SIZES, type PostSizeId } from "@/lib/editor/types";

const ORDER: PostSizeId[] = ["square", "portrait", "landscape", "story"];

/** First screen: photo post or video reel, then (for photos) the post's size. */
export function StartScreen({ onPick }: { onPick: (media: "photo" | "video", size: PostSizeId) => void }) {
  const [step, setStep] = useState<"media" | "size">("media");

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-10 md:justify-center md:py-12">
      <div className="w-full max-w-4xl">
        {step === "media" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance text-ink md:text-[28px]">
              What are you making today?
            </h1>
            <p className="mt-2 max-w-[60ch] text-[15px] text-pretty text-ink-soft">
              Start from a photo for a feed post, or from a video for a reel. Both get the same filters, text and
              stickers.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:gap-4">
              <MediaCard
                icon={<ImageIcon className="size-6" />}
                title="Photo post"
                body="A still image for your feed, stories or a link share. Export as JPG or PNG."
                meta="1:1 · 3:4 · 16:9 · 9:16"
                onClick={() => setStep("size")}
              />
              <MediaCard
                icon={<Film className="size-6" />}
                title="Video reel"
                body="Add text and stickers on top of a clip, trim it and export a ready-to-post video."
                meta="9:16 · 1080 × 1920"
                onClick={() => onPick("video", "story")}
              />
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("media")}
              className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua"
            >
              <ArrowLeft className="size-4" /> Photo or video
            </button>
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
                    onClick={() => onPick("photo", id)}
                    className="group flex flex-col rounded-lg border border-rule bg-sheet p-4 text-left outline-none transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-[0_8px_24px_-12px_oklch(0.2_0.02_260/0.35)] focus-visible:ring-2 focus-visible:ring-aqua"
                  >
                    <span className="grid h-36 place-items-center rounded-md bg-table/60">
                      <SizePreview w={s.w} h={s.h} />
                    </span>
                    <span className="mt-4 font-heading text-[15px] font-semibold text-ink">{s.label}</span>
                    <span className="mt-0.5 flex items-baseline gap-2 font-mono text-xs text-ink-soft tabular">
                      <span className="font-semibold text-brand-ink">{s.ratio}</span>
                      {s.w} × {s.h}
                    </span>
                    <span className="mt-2 text-[13px] text-pretty text-ink-soft">{s.use}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-6 text-xs text-ink-soft">Everything stays in your browser. Nothing is uploaded.</p>
      </div>
    </main>
  );
}

function MediaCard({
  icon,
  title,
  body,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-lg border border-rule bg-sheet p-5 text-left outline-none transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-[0_8px_24px_-12px_oklch(0.2_0.02_260/0.35)] focus-visible:ring-2 focus-visible:ring-aqua"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-wash text-brand">{icon}</span>
      <span className="flex flex-col">
        <span className="font-heading text-lg font-semibold text-ink">{title}</span>
        <span className="mt-1 text-[14px] text-pretty text-ink-soft">{body}</span>
        <span className="mt-3 font-mono text-xs text-ink-soft tabular">{meta}</span>
      </span>
    </button>
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
        className="fill-sheet transition-[fill] group-hover:fill-brand-wash"
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
