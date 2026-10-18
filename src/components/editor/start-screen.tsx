"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Film, ImageIcon } from "lucide-react";
import type { DraftSummary } from "@/lib/editor/draft";
import { POST_SIZES, type PostSizeId } from "@/lib/editor/types";

const ORDER: PostSizeId[] = ["square", "portrait", "landscape", "story", "original"];

/** First screen: photo post or video reel, then (for photos) the post's size. */
export type StartStep = "media" | "size" | "reel";

export function StartScreen({
  onPick,
  initialStep = "media",
  resume,
  onResume,
}: {
  onPick: (media: "photo" | "video", size: PostSizeId) => void;
  /** Open straight on the photo sizes or reel sizes, e.g. from the New menu. */
  initialStep?: StartStep;
  /** A post saved in this browser that can be picked up again. */
  resume?: DraftSummary | null;
  onResume?: () => Promise<void> | void;
}) {
  const [opening, setOpening] = useState(false);
  const [step, setStep] = useState<StartStep>(initialStep);

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-10 md:justify-center md:py-12">
      <div className="w-full max-w-4xl">
        {step === "media" ? (
          <>
            {resume && onResume && (
              <button
                type="button"
                disabled={opening}
                onClick={async () => {
                  setOpening(true);
                  try {
                    await onResume();
                  } finally {
                    setOpening(false);
                  }
                }}
                className="group mb-8 flex w-full items-center gap-4 rounded-lg border border-aqua/40 bg-sheet p-3 text-left outline-none transition-[border-color,box-shadow] hover:border-aqua hover:shadow-[0_8px_24px_-12px_oklch(0.2_0.02_260/0.35)] focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-70 sm:max-w-md"
              >
                <span className="checker grid size-16 shrink-0 place-items-center overflow-hidden rounded-md ring-1 ring-rule">
                  {resume.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resume.thumb} alt="" className="max-h-full max-w-full object-contain" />
                  ) : resume.media === "video" ? (
                    <Film className="size-5 text-ink-soft" />
                  ) : (
                    <ImageIcon className="size-5 text-ink-soft" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-heading text-[15px] font-semibold text-ink">
                    {opening ? "Opening…" : `Continue your last ${resume.media === "video" ? "reel" : "post"}`}
                  </span>
                  <span className="text-[13px] text-ink-soft">Saved {timeAgo(resume.savedAt)} in this browser</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-aqua-ink transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
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
                meta="1:1 · 3:4 · 16:9 · 9:16 · original"
                onClick={() => setStep("size")}
              />
              <MediaCard
                icon={<Film className="size-6" />}
                title="Video reel"
                body="Add text and stickers on top of a clip, trim it and export a ready-to-post video."
                meta="9:16 · original"
                onClick={() => setStep("reel")}
              />
            </div>
          </>
        ) : step === "reel" ? (
          <>
            <BackLink onClick={() => setStep("media")} />
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance text-ink md:text-[28px]">
              What size is your reel?
            </h1>
            <p className="mt-2 max-w-[60ch] text-[15px] text-pretty text-ink-soft">
              Facebook reels are 9:16. Choose Original to export at the exact size and shape of the video you add.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md md:gap-4">
              <SizeCard
                title="Reel"
                ratio="9:16"
                dims="1080 × 1920"
                use="Full-screen reels and stories"
                preview={<SizePreview w={1080} h={1920} />}
                onClick={() => onPick("video", "story")}
              />
              <SizeCard
                title="Original size"
                ratio="Fit"
                dims="Same as your video"
                use="Keeps the clip's own size and shape"
                preview={<SizePreview w={4} h={3} dashed />}
                onClick={() => onPick("video", "original")}
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

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 md:gap-4">
              {ORDER.map((id) => {
                const s = POST_SIZES[id];
                const original = id === "original";
                return (
                  <SizeCard
                    key={id}
                    title={s.label}
                    ratio={s.ratio}
                    dims={original ? "Same as your photo" : `${s.w} × ${s.h}`}
                    use={s.use}
                    preview={original ? <SizePreview w={4} h={3} dashed /> : <SizePreview w={s.w} h={s.h} />}
                    onClick={() => onPick("photo", id)}
                  />
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

function timeAgo(t: number) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua"
    >
      <ArrowLeft className="size-4" /> Photo or video
    </button>
  );
}

function SizeCard({
  title,
  ratio,
  dims,
  use,
  preview,
  onClick,
}: {
  title: string;
  ratio: string;
  dims: string;
  use: string;
  preview: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-lg border border-rule bg-sheet p-4 text-left outline-none transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-[0_8px_24px_-12px_oklch(0.2_0.02_260/0.35)] focus-visible:ring-2 focus-visible:ring-aqua"
    >
      <span className="grid h-36 place-items-center rounded-md bg-table/60">{preview}</span>
      <span className="mt-4 font-heading text-[15px] font-semibold text-ink">{title}</span>
      <span className="mt-0.5 flex items-baseline gap-2 font-mono text-xs text-ink-soft tabular">
        <span className="font-semibold text-brand-ink">{ratio}</span>
        {dims}
      </span>
      <span className="mt-2 text-[13px] text-pretty text-ink-soft">{use}</span>
    </button>
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
export function SizePreview({ w, h, max = 96, dashed = false }: { w: number; h: number; max?: number; dashed?: boolean }) {
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
        stroke={dashed ? "var(--ink-soft)" : undefined}
        strokeDasharray={dashed ? "4 3" : undefined}
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
