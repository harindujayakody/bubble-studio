"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { orientImage, postDims, renderPost, type Assets } from "@/lib/editor/render";
import { MAX_PAGES, pageStates } from "@/lib/editor/pages";
import type { PostState } from "@/lib/editor/types";

const THUMB_W = 96;

/** A page drawn small for the strip, with its own photo. */
function thumb(page: PostState, assets: Assets) {
  const c = document.createElement("canvas");
  c.width = THUMB_W;
  c.height = Math.round(THUMB_W / postDims(page).aspect);
  const photo = page.photoId ? assets[page.photoId] : undefined;
  const source = photo ? orientImage(photo, page.orientation, 400) : null;
  renderPost(c.getContext("2d")!, { source, assets, state: page, width: THUMB_W });
  return c.toDataURL("image/jpeg", 0.7);
}

/** Pages of a carousel under the canvas: switch, add, duplicate, move and delete. */
export function PageStrip({
  state,
  assets,
  onGo,
  onAdd,
  onDelete,
  onMove,
}: {
  state: PostState;
  assets: Assets;
  onGo: (i: number) => void;
  onAdd: (copy: boolean) => void;
  onDelete: (i: number) => void;
  onMove: (i: number, to: number) => void;
}) {
  const pages = pageStates(state);
  const current = state.page ?? 0;
  const [thumbs, setThumbs] = useState<string[]>([]);
  const t = useT();

  // Redraw the small pages shortly after edits settle.
  useEffect(() => {
    const id = window.setTimeout(() => setThumbs(pageStates(state).map((p) => thumb(p, assets))), 300);
    return () => window.clearTimeout(id);
  }, [state, assets]);

  const aspect = postDims(state).aspect;
  const full = pages.length >= MAX_PAGES;
  const action = "grid size-7 place-items-center rounded-full text-ink-soft outline-none hover:bg-tile hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-35 disabled:hover:bg-transparent";

  if (pages.length === 1) {
    return (
      <div className="flex justify-center pb-1">
        <button
          type="button"
          onClick={() => onAdd(false)}
          className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-soft outline-none hover:bg-tile hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua"
        >
          <Plus className="size-3.5" /> {t("Add page (carousel)")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-4 pb-1">
      <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1" aria-label="Pages">
        {pages.map((_, i) => (
          <li key={i} className="shrink-0">
            <button
              type="button"
              aria-label={`Page ${i + 1}`}
              aria-current={i === current ? "page" : undefined}
              onClick={() => onGo(i)}
              className={cn(
                "relative block h-14 overflow-hidden rounded-md bg-tile outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                i === current ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100",
              )}
              style={{ aspectRatio: aspect }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumbs[i] && <img src={thumbs[i]} alt="" className="size-full object-cover" />}
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 font-mono text-[10px] text-white tabular">{i + 1}</span>
            </button>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            aria-label="Add a blank page"
            title="Add a blank page"
            disabled={full}
            onClick={() => onAdd(false)}
            className="grid h-14 place-items-center rounded-md border border-dashed border-rule text-ink-soft outline-none hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-40"
            style={{ aspectRatio: aspect }}
          >
            <Plus className="size-4" />
          </button>
        </li>
      </ol>
      <div className="flex shrink-0 items-center" role="group" aria-label={`Page ${current + 1} of ${pages.length}`}>
        <button type="button" className={action} aria-label="Move page earlier" disabled={current === 0} onClick={() => onMove(current, current - 1)}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className={action} aria-label="Move page later" disabled={current === pages.length - 1} onClick={() => onMove(current, current + 1)}>
          <ChevronRight className="size-4" />
        </button>
        <button type="button" className={action} aria-label="Duplicate page" disabled={full} onClick={() => onAdd(true)}>
          <Copy className="size-4" />
        </button>
        <button type="button" className={cn(action, "hover:text-destructive")} aria-label="Delete page" onClick={() => onDelete(current)}>
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
