"use client";

import { useState } from "react";
import { ArrowRight, AudioLines, Film, ImageIcon, Lock, MoreHorizontal, Play, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftSummary } from "@/lib/editor/draft";
import { gradientCss, GRADIENT_PRESETS } from "@/lib/editor/palettes";
import { POST_SIZES, type PostSizeId, type ToolId } from "@/lib/editor/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BulkIcon, VideoIcon } from "./tool-icons";

const PHOTO_SIZES: PostSizeId[] = ["square", "portrait", "landscape", "story", "original"];
const REEL_SIZES: PostSizeId[] = ["story", "landscape", "original"];
/** Chip labels, short enough to read whole on a phone. */
const SHORT: Record<PostSizeId, string> = {
  square: "Square",
  portrait: "Portrait",
  landscape: "Landscape",
  story: "Story",
  original: "Original",
};

export const REPO_URL = "https://github.com/harindujayakody/bubble-studio";

/** Which card the start screen points at when opened from the New menu. */
export type StartStep = "media" | "size" | "reel";
/** Stand-alone tools that open from the start screen instead of the editor. */
export type StartTool = "merge" | "extract";

export function StartScreen({
  onPick,
  onTool,
  initialStep = "media",
  recents = [],
  onOpen,
  onRemove,
}: {
  onPick: (media: "photo" | "video", size: PostSizeId, openTool?: ToolId) => void;
  onTool: (tool: StartTool) => void;
  initialStep?: StartStep;
  /** Designs saved in this browser, newest first. */
  recents?: DraftSummary[];
  onOpen?: (id: string) => Promise<void> | void;
  onRemove?: (id: string) => Promise<void> | void;
}) {
  const [opening, setOpening] = useState<string | null>(null);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-8 md:px-8 md:pt-8">
        <section className="app-header relative overflow-hidden rounded-2xl px-6 pt-9 pb-20 text-center md:px-10 md:pt-12 md:pb-24">
          <h1 className="font-heading text-[26px] leading-tight font-bold tracking-[0.01em] text-balance uppercase md:text-[42px]">
            What will you make today?
          </h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-[15px] text-pretty text-white/85 md:text-base">
            Facebook posts from a photo, reels from a video. Pick a size to start; you can change it later.
          </p>
        </section>

        <div className="relative -mt-14 grid gap-4 px-2 md:-mt-16 md:grid-cols-2 md:gap-5 md:px-6">
          <CreateCard
            highlighted={initialStep === "size"}
            title="Photo post"
            body="Filters, text, stickers and blur on a photo. Exports JPG or PNG."
            art={<PostArt />}
            sizes={PHOTO_SIZES}
            reel={false}
            onPick={(size) => onPick("photo", size)}
          />
          <CreateCard
            highlighted={initialStep === "reel"}
            title="Video reel"
            body="Text and stickers timed over a clip, with music. Exports a video."
            art={<ReelArt />}
            sizes={REEL_SIZES}
            reel
            onPick={(size) => onPick("video", size)}
          />
        </div>

        {recents.length > 0 && onOpen && (
          <section className="mt-10 md:mt-12 md:px-6" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="font-heading text-xl font-semibold text-ink md:text-2xl">
              Continue designing
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              {recents.map((d) => (
                <RecentCard
                  key={d.id}
                  design={d}
                  opening={opening === d.id}
                  onOpen={async () => {
                    setOpening(d.id);
                    try {
                      await onOpen(d.id);
                    } finally {
                      setOpening(null);
                    }
                  }}
                  onRemove={onRemove ? () => void onRemove(d.id) : undefined}
                />
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10 md:mt-12 md:px-6" aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="font-heading text-xl font-semibold text-ink md:text-2xl">
            More tools
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <ToolTile
              icon={<BulkIcon className="size-6" />}
              title="Bulk edit photos"
              body="One design on many photos"
              onClick={() => onPick("photo", "square", "bulk")}
            />
            <ToolTile
              icon={<VideoIcon className="size-6" />}
              title="Bulk edit reels"
              body="One design on many clips"
              onClick={() => onPick("video", "story", "bulk")}
            />
            <ToolTile
              icon={<MergeIcon className="size-6" />}
              title="Merge videos"
              body="Join clips into one video"
              onClick={() => onTool("merge")}
            />
            <ToolTile
              icon={<AudioLines className="size-6" strokeWidth={1.75} />}
              title="Extract audio"
              body="Save the sound from a video"
              onClick={() => onTool("extract")}
            />
          </div>
        </section>

        <StartFooter />
      </div>
    </main>
  );
}

/** "Everything stays on your computer. Version 1.1.0 | GitHub repo · Star" */
export function StartFooter() {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-rule pt-6 text-xs text-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <Lock className="size-3.5" /> Everything stays on your computer.
      </span>
      <span className="font-mono tabular">Version {process.env.NEXT_PUBLIC_APP_VERSION ?? "1.1.0"}</span>
      <span aria-hidden className="h-3.5 w-px bg-rule" />
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md font-medium text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <GithubMark className="size-4" /> GitHub repo
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        title="Open the repo and press Star"
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-rule bg-sheet px-2.5 font-medium text-ink outline-none transition-colors hover:border-[#e3b341] focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <Star className="size-3.5 fill-[#e3b341] text-[#e3b341]" /> Star
      </a>
    </footer>
  );
}

function RecentCard({
  design,
  opening,
  onOpen,
  onRemove,
}: {
  design: DraftSummary;
  opening: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const reel = design.media === "video";
  const s = POST_SIZES[design.size];
  const sizeLabel = reel && design.size === "story" ? "Reel" : s.label;
  return (
    <li className="group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        className="block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-70"
        aria-label={`Open ${design.name}`}
      >
        <span className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-tile p-3 transition-colors group-hover:bg-brand-wash">
          {design.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={design.thumb}
              alt=""
              className="max-h-full max-w-full rounded-[3px] object-contain shadow-sheet transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : reel ? (
            <Film className="size-7 text-ink-soft" />
          ) : (
            <ImageIcon className="size-7 text-ink-soft" />
          )}
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            <Lock className="size-3" /> Private
          </span>
          {opening && (
            <span className="absolute inset-0 grid place-items-center bg-sheet/70 text-[13px] font-medium text-ink">
              Opening…
            </span>
          )}
        </span>
        <span className="mt-2 block truncate text-[14px] font-semibold text-ink">{design.name}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-soft">
          <span
            className={cn("grid size-4 shrink-0 place-items-center rounded-[4px] text-white", reel ? "bg-[#e5266e]" : "bg-brand")}
            aria-hidden
          >
            {reel ? <Play className="size-2.5 fill-current" /> : <ImageIcon className="size-2.5" />}
          </span>
          <span className="truncate">
            {sizeLabel} · Edited {timeAgo(design.savedAt)}
          </span>
        </span>
      </button>
      {onRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More for ${design.name}`}
            className="absolute top-2 right-2 grid size-7 place-items-center rounded-md bg-sheet/90 text-ink opacity-0 shadow-float outline-none transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-aqua aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1">
            <DropdownMenuItem onClick={onRemove} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 /> Remove from recent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function CreateCard({
  title,
  body,
  art,
  sizes,
  reel,
  highlighted,
  onPick,
}: {
  title: string;
  body: string;
  art: React.ReactNode;
  sizes: PostSizeId[];
  reel: boolean;
  highlighted: boolean;
  onPick: (size: PostSizeId) => void;
}) {
  return (
    <article className={cn("flex flex-col rounded-2xl bg-sheet p-4 shadow-float md:p-5", highlighted && "ring-2 ring-brand")}>
      <button
        type="button"
        onClick={() => onPick(sizes[0])}
        className="group flex items-center gap-4 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <span className="grid h-28 w-28 shrink-0 place-items-center rounded-xl bg-tile transition-colors group-hover:bg-brand-wash md:h-32 md:w-32">
          {art}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 font-heading text-lg font-semibold text-ink">
            {title}
            <ArrowRight className="size-4 text-brand opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </span>
          <span className="mt-1 text-[14px] text-pretty text-ink-soft">{body}</span>
        </span>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={`${title} sizes`}>
        {sizes.map((id) => {
          const s = POST_SIZES[id];
          const label = reel && id === "story" ? "Reel" : SHORT[id];
          return (
            <button
              key={id}
              type="button"
              autoFocus={highlighted && id === sizes[0]}
              onClick={() => onPick(id)}
              title={id === "original" ? `Same size as your ${reel ? "video" : "photo"}` : `${s.w} × ${s.h}`}
              className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-rule bg-sheet pr-2.5 pl-2 text-[13px] sm:gap-2 sm:pl-2.5 font-medium text-ink outline-none transition-colors hover:border-brand hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua sm:pr-3.5"
            >
              <SizeGlyph id={id} />
              <span className="truncate">{label}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-soft tabular max-[399px]:hidden sm:ml-0">{id === "original" ? "fit" : s.ratio}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function ToolTile({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tool-button group flex items-center gap-3.5 rounded-xl bg-sheet p-3 text-left shadow-float outline-none transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-aqua"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-wash text-brand">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-heading text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] leading-snug text-pretty text-ink-soft">{body}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-soft transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  );
}

/** Two clips joining into one. Same grid and stroke as the tool icons. */
export function MergeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect className="duo" x="2.5" y="4" width="8" height="6.5" rx="1.75" />
      <rect x="2.5" y="13.5" width="8" height="6.5" rx="1.75" />
      <path d="M10.5 7.25h2.25a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H10.5" />
      <path d="M14.75 12h6.75M19 9.5 21.5 12 19 14.5" />
    </svg>
  );
}

/** GitHub's mark (lucide has no brand icons). */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** A tiny outline of the size's shape. */
function SizeGlyph({ id }: { id: PostSizeId }) {
  const s = POST_SIZES[id];
  const original = id === "original";
  const scale = 16 / Math.max(original ? 4 : s.w, original ? 3 : s.h);
  const w = Math.round((original ? 4 : s.w) * scale);
  const h = Math.round((original ? 3 : s.h) * scale);
  return (
    <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
      <span
        className={cn("rounded-[3px] border-[1.5px] border-current text-brand", original && "border-dashed")}
        style={{ width: w, height: h }}
      />
    </span>
  );
}

const sunset = GRADIENT_PRESETS.find((g) => g.name === "Sunset Pop")!.stops;
const neon = GRADIENT_PRESETS.find((g) => g.name === "Neon Night")!.stops;

/** A miniature photo post: a headline and a sticker on a colourful square. */
function PostArt() {
  return (
    <span
      aria-hidden
      className="relative block size-[78%] -rotate-3 rounded-lg shadow-sheet transition-transform duration-300 ease-out group-hover:rotate-0"
      style={{ background: gradientCss(sunset) }}
    >
      <span className="absolute top-[22%] left-[14%] h-[11%] w-[62%] rounded-full bg-white/95" />
      <span className="absolute top-[40%] left-[14%] h-[7%] w-[40%] rounded-full bg-white/70" />
      <span className="absolute right-[12%] bottom-[12%] size-[30%] rounded-full bg-[#FFD200] ring-4 ring-white/40" />
    </span>
  );
}

/** A miniature reel: a tall clip with a play button and a timeline. */
function ReelArt() {
  return (
    <span
      aria-hidden
      className="relative block h-[86%] w-[50%] rotate-3 overflow-hidden rounded-lg shadow-sheet transition-transform duration-300 ease-out group-hover:rotate-0"
      style={{ background: gradientCss(neon) }}
    >
      <span className="absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full bg-white/90 text-[#3F5EFB]">
        <Play className="size-3.5 translate-x-px fill-current" />
      </span>
      <span className="absolute inset-x-[12%] bottom-[10%] h-1 rounded-full bg-white/35">
        <span className="block h-full w-2/5 rounded-full bg-white" />
      </span>
    </span>
  );
}

export function timeAgo(t: number) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The size's shape as a small sheet, for menus. */
export function SizePreview({ w, h, max = 96, dashed = false }: { w: number; h: number; max?: number; dashed?: boolean }) {
  const scale = max / Math.max(w, h);
  return (
    <span
      aria-hidden
      className={cn("block rounded-[3px] border-[1.5px] border-ink-soft/70 bg-tile", dashed && "border-dashed")}
      style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}
    />
  );
}
