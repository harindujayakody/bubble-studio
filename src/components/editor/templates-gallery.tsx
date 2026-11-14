"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ensureFonts, postDims, renderPost } from "@/lib/editor/render";
import { useBrand } from "@/lib/editor/brand";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  deleteMyTemplate,
  myTemplateState,
  readMyTemplates,
  templateState,
  type MyTemplate,
  type TemplateCategory,
} from "@/lib/editor/templates";
import type { PostState } from "@/lib/editor/types";

const PREVIEW_W = 240;

/** Draw a design small, for its gallery tile. */
async function preview(state: PostState) {
  await ensureFonts(state);
  const c = document.createElement("canvas");
  c.width = PREVIEW_W;
  c.height = Math.round(PREVIEW_W / postDims(state).aspect);
  renderPost(c.getContext("2d")!, { source: null, state, width: PREVIEW_W });
  return c.toDataURL("image/jpeg", 0.82);
}

const NONE: MyTemplate[] = [];
const mineListeners = new Set<() => void>();
let mine: MyTemplate[] | null = null;
const getMine = () => (mine ??= readMyTemplates());
/** Call after saving a template so the gallery shows it. */
export function refreshMyTemplates() {
  mine = readMyTemplates();
  mineListeners.forEach((l) => l());
}

/** Start-page gallery: pick a template (optionally restyled with the brand kit) to open it. */
export function TemplatesGallery({ onPick }: { onPick: (state: PostState) => void }) {
  const brand = useBrand();
  const hasBrand = brand.colors.length > 0 || !!brand.headingFont || !!brand.bodyFont;
  const [useBrandKit, setUseBrandKit] = useState(true);
  const [category, setCategory] = useState<TemplateCategory | "all" | "mine">("all");
  const [showAll, setShowAll] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const myTemplates = useSyncExternalStore(
    (l) => {
      mineListeners.add(l);
      return () => mineListeners.delete(l);
    },
    getMine,
    () => NONE,
  );

  const styled = hasBrand && useBrandKit ? brand : null;
  const list = category === "all" ? TEMPLATES : category === "mine" ? [] : TEMPLATES.filter((t) => t.category === category);
  const visible = showAll || category !== "all" ? list : list.slice(0, 10);

  // Previews follow the brand kit switch; drawn after the page has settled.
  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(async () => {
      const next: Record<string, string> = {};
      for (const t of TEMPLATES) next[t.id] = await preview(templateState(t, styled));
      for (const t of myTemplates) next[t.id] = await preview(t.state);
      if (alive) setThumbs(next);
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [styled, myTemplates]);

  const tile = (id: string, name: string, aspect: number, onClick: () => void, extra?: React.ReactNode) => (
    <li key={id} className="group relative min-w-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Use template: ${name}`}
        className="block w-full overflow-hidden rounded-xl bg-tile shadow-float outline-none ring-brand transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:ring-2 focus-visible:ring-2 focus-visible:ring-aqua"
        style={{ aspectRatio: aspect }}
      >
        {thumbs[id] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbs[id]} alt="" className="size-full object-cover" />
        ) : (
          <span className="block size-full animate-pulse bg-tile" />
        )}
      </button>
      <p className="mt-1.5 truncate text-[13px] font-medium text-ink">{name}</p>
      {extra}
    </li>
  );

  return (
    <section className="mt-10 md:mt-12 md:px-6" aria-labelledby="templates-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="templates-heading" className="font-heading text-xl font-semibold text-ink md:text-2xl">
          Start from a template
        </h2>
        {hasBrand && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            Use my brand colours and fonts
            <Switch checked={useBrandKit} onCheckedChange={setUseBrandKit} aria-label="Use my brand colours and fonts" />
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Template categories">
        {(["all", ...(myTemplates.length ? (["mine"] as const) : []), ...TEMPLATE_CATEGORIES.map((c) => c.id)] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={category === id}
            onClick={() => setCategory(id)}
            className={cn(
              "h-8 rounded-full px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
              category === id ? "bg-ink text-sheet" : "bg-sheet text-ink shadow-float hover:bg-brand-wash",
            )}
          >
            {id === "all" ? "All" : id === "mine" ? "My templates" : TEMPLATE_CATEGORIES.find((c) => c.id === id)!.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {category === "mine"
          ? myTemplates.map((t) =>
              tile(t.id, t.name, postDims(t.state).aspect, () => onPick(myTemplateState(t)), (
                <button
                  type="button"
                  aria-label={`Delete template ${t.name}`}
                  onClick={() => {
                    deleteMyTemplate(t.id);
                    refreshMyTemplates();
                  }}
                  className="absolute top-2 right-2 grid size-7 place-items-center rounded-md bg-sheet/90 text-destructive opacity-0 shadow-float group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              )),
            )
          : visible.map((t) => tile(t.id, t.name, t.size === "story" ? 9 / 16 : t.size === "feed" ? 0.8 : 1, () => onPick(templateState(t, styled))))}
      </ul>
      {category === "all" && !showAll && list.length > visible.length && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="h-9 rounded-full bg-sheet px-4 text-[13px] font-semibold text-ink shadow-float outline-none hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
          >
            Show all {list.length} templates
          </button>
        </div>
      )}
    </section>
  );
}
