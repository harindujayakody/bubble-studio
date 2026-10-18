"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, Circle, Copy, Grid3x3, Droplets, ImagePlus, Square, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ColorField, IconAction, PanelSection, RangeField } from "./controls";
import type { RegionDefaults } from "./canvas-stage";
import { EMOJI_FONT, EMOJI_GROUPS, type LibrarySticker } from "@/lib/editor/stickers";
import { canDecodeGif } from "@/lib/editor/gif";
import { ANIMATED, GRID_LAYOUTS, ROUNDABLE, SHAPES, drawAnimated, gridLayout, shapePath } from "@/lib/editor/elements";
import { CategoryArt, type ElementCategory } from "./element-tiles";
import { Switch } from "@/components/ui/switch";
import { nextZ, restack } from "@/lib/editor/layers";
import type { Assets } from "@/lib/editor/render";
import type { CollageGrid, PostState, Region, ShapeId, Sticker } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;
export type NewSticker = Pick<Sticker, "kind" | "value"> & Partial<Sticker>;

/* --------------------------------------------------------------- Elements */

const CATEGORIES: { id: ElementCategory; label: string; soon?: boolean }[] = [
  { id: "stickers", label: "Stickers" },
  { id: "shapes", label: "Shapes" },
  { id: "animated", label: "Animated" },
  { id: "gifs", label: "GIFs" },
  { id: "grids", label: "Grids" },
  { id: "emoji", label: "Emoji" },
  { id: "upload", label: "Uploads" },
  { id: "charts", label: "Charts", soon: true },
  { id: "frames", label: "Frames", soon: true },
  { id: "mockups", label: "Mockups", soon: true },
  { id: "three", label: "3D", soon: true },
];

export function ElementsPanel({
  state,
  update,
  assets,
  selectedId,
  onSelect,
  onAdd,
  onAddCustom,
  onUpload,
  onUploadGif,
  library,
  onPickCell,
}: {
  state: PostState;
  update: Update;
  assets: Assets;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (s: NewSticker) => void;
  onAddCustom: (id: string, src: string) => void;
  onUpload: () => void;
  onUploadGif: () => void;
  library: LibrarySticker[];
  /** Choose a photo for a collage cell. */
  onPickCell: (index: number) => void;
}) {
  const sticker = state.stickers.find((s) => s.id === selectedId) ?? null;
  const [category, setCategory] = useState<ElementCategory | null>(null);
  const current = CATEGORIES.find((c) => c.id === category);
  const video = state.media === "video";

  return (
    <>
      {sticker && <StickerEditor sticker={sticker} state={state} update={update} onSelect={onSelect} />}
      {state.grid && !video && <CollageEditor state={state} update={update} assets={assets} onPickCell={onPickCell} />}

      {!current ? (
        <PanelSection title="Elements">
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {CATEGORIES.filter((c) => !(video && c.id === "grids")).map((c) => {
              const reelOnly = (c.id === "animated" || c.id === "gifs") && !video;
              const off = c.soon || reelOnly;
              return (
              <button
                key={c.id}
                type="button"
                disabled={off}
                title={reelOnly ? `${c.label} are for reels` : undefined}
                onClick={() => setCategory(c.id)}
                className="group relative flex flex-col items-center gap-1.5 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-aqua disabled:cursor-default"
              >
                <span
                  className={cn(
                    "block size-[68px] transition-transform duration-200 ease-out",
                    off ? "opacity-45 grayscale-[35%]" : "group-hover:-translate-y-0.5 group-hover:scale-105",
                  )}
                >
                  <CategoryArt id={c.id} />
                </span>
                <span className={cn("text-[13px] font-medium", off ? "text-ink-soft" : "text-ink")}>{c.label}</span>
                {off && (
                  <span className="absolute top-0 right-0 rounded-full bg-tile px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft ring-1 ring-rule">
                    {reelOnly ? "Reels" : "Soon"}
                  </span>
                )}
              </button>
              );
            })}
          </div>
        </PanelSection>
      ) : (
        <section className="px-4 pt-3 pb-5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="-ml-1 mb-3 inline-flex h-8 items-center gap-1.5 rounded-md pr-2 pl-1 font-heading text-[15px] font-semibold text-ink outline-none hover:bg-tile focus-visible:ring-2 focus-visible:ring-aqua"
          >
            <ChevronLeft className="size-4" /> {current.label}
          </button>

          {category === "stickers" && (
            <div className="grid grid-cols-3 gap-2">
              {library.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Add sticker ${i + 1}`}
                  onClick={() => onAddCustom(c.id, c.src)}
                  className="grid aspect-square place-items-center rounded-xl bg-tile p-2 outline-none transition-colors hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {category === "shapes" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    aria-label={`Add ${sh.label.toLowerCase()}`}
                    title={sh.label}
                    onClick={() =>
                      onAdd({
                        kind: "shape",
                        value: sh.id,
                        shape: sh.id,
                        size: sh.id === "line" ? 520 : 300,
                        aspect: SHAPE_ASPECT[sh.id] ?? 1,
                        color: "#7d2ae8",
                        fill: sh.id === "line" ? "#111111" : "#7d2ae8",
                        stroke: "#111111",
                        strokeWidth: 0,
                        radius: sh.id === "square" ? 0 : sh.id === "rounded" ? 35 : 30,
                      })
                    }
                    className="grid aspect-square place-items-center rounded-xl bg-tile p-4 text-brand outline-none transition-colors hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
                  >
                    <ShapeThumb shape={sh.id} />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-pretty text-ink-soft">
                Change the fill, border and corners after adding. Drag a corner to resize.
              </p>
            </>
          )}

          {category === "animated" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {ANIMATED.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={`Add ${a.label.toLowerCase()}`}
                    title={a.label}
                    onClick={() => onAdd({ kind: "animated", value: a.id, color: a.color, size: 240 })}
                    className="grid aspect-square place-items-center rounded-xl bg-tile p-2 outline-none transition-colors hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
                  >
                    <AnimatedThumb id={a.id} color={a.color} />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-pretty text-ink-soft">
                They move in your reel and in the exported video.
              </p>
            </>
          )}

          {category === "grids" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {GRID_LAYOUTS.map((g) => {
                  const active = state.grid?.layout === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-label={g.label}
                      aria-pressed={active}
                      title={g.label}
                      onClick={() =>
                        update((s) => {
                          const prev = s.grid?.cells ?? (s.photoId ? [s.photoId] : []);
                          const cells = g.cells.map((_, i) => prev[i] ?? null);
                          return { ...s, grid: { layout: g.id, cells, gap: s.grid?.gap ?? 12, radius: s.grid?.radius ?? 0 } };
                        }, "grid:layout")
                      }
                      className={cn(
                        "relative aspect-square rounded-xl bg-tile p-2 outline-none transition-colors hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua",
                        active && "bg-brand-wash ring-2 ring-brand",
                      )}
                    >
                      <span className="relative block size-full">
                        {g.cells.map(([x, y, w, h], i) => (
                          <span
                            key={i}
                            className="absolute rounded-[3px] bg-brand/70"
                            style={cellStyle(x, y, w, h, 2)}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-pretty text-ink-soft">
                Pick a layout, then add a photo to each cell. Filters and adjustments apply to every photo.
              </p>
            </>
          )}

          {category === "emoji" && (
            <div className="grid gap-4">
              {EMOJI_GROUPS.map((g) => (
                <div key={g.label}>
                  <h4 className="mb-1.5 text-xs font-semibold text-ink-soft">{g.label}</h4>
                  <div className="grid grid-cols-6 gap-1">
                    {g.items.map((e) => (
                      <button
                        key={g.label + e}
                        type="button"
                        aria-label={`Add ${e}`}
                        onClick={() => onAdd({ kind: "emoji", value: e })}
                        className="grid aspect-square place-items-center rounded-lg text-[26px] leading-none outline-none transition-transform hover:scale-110 hover:bg-tile focus-visible:ring-2 focus-visible:ring-aqua"
                        style={{ fontFamily: EMOJI_FONT }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {category === "gifs" && (
            <>
              <p className="mb-3 text-[13px] text-pretty text-ink-soft">
                Add an animated GIF on top of your reel. It loops for as long as it shows, in the preview and the export.
              </p>
              <Button onClick={onUploadGif} disabled={!canDecodeGif()}>
                <Upload /> Upload GIF
              </Button>
              {!canDecodeGif() && (
                <p className="mt-2 text-xs text-ink-soft">This browser can&apos;t play GIFs in reels. Use Chrome, Edge or the desktop app.</p>
              )}
              {state.stickers.some((s) => s.kind === "gif") && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {state.stickers
                    .filter((s) => s.kind === "gif")
                    .map((s) => s.value)
                    .filter((v, i, a) => a.indexOf(v) === i && assets[v])
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-label="Add this GIF again"
                        onClick={() => onAdd({ kind: "gif", value: id, size: 320 })}
                        className="checker grid aspect-square place-items-center overflow-hidden rounded-lg ring-1 ring-rule outline-none hover:ring-brand/60 focus-visible:ring-2 focus-visible:ring-aqua"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assets[id].src} alt="" className="max-h-full max-w-full object-contain" />
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          {category === "upload" && (
            <>
              <p className="mb-3 text-[13px] text-pretty text-ink-soft">
                Add your logo, a product cut-out or any picture on top of the post. PNGs keep their transparent background.
              </p>
              <Button onClick={onUpload}>
                <Upload /> Upload image
              </Button>
              {Object.keys(assets).length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {state.stickers
                    .filter((s) => s.kind === "image" && !s.value.startsWith("custom:"))
                    .map((s) => s.value)
                    .filter((v, i, a) => a.indexOf(v) === i && assets[v])
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-label="Add this image again"
                        onClick={() => onAdd({ kind: "image", value: id })}
                        className="checker grid aspect-square place-items-center overflow-hidden rounded-lg ring-1 ring-rule outline-none hover:ring-brand/60 focus-visible:ring-2 focus-visible:ring-aqua"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assets[id].src} alt="" className="max-h-full max-w-full object-contain" />
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

const SHAPE_ASPECT: Partial<Record<ShapeId, number>> = Object.fromEntries(SHAPES.map((s) => [s.id, s.aspect ?? 1]));

/** Position a collage cell (fractions) inside a preview box, with a small inset. */
function cellStyle(x: number, y: number, w: number, h: number, inset: number): React.CSSProperties {
  return {
    left: `calc(${x * 100}% + ${inset}px)`,
    top: `calc(${y * 100}% + ${inset}px)`,
    width: `calc(${w * 100}% - ${inset * 2}px)`,
    height: `calc(${h * 100}% - ${inset * 2}px)`,
  };
}

/** A still drawing of a shape for its picker tile, in the tile's text colour. */
function ShapeThumb({ shape }: { shape: ShapeId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const size = c.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    const aspect = shape === "line" ? 10 : (SHAPE_ASPECT[shape] ?? 1);
    const w = size * 0.86;
    ctx.fillStyle = getComputedStyle(c).color;
    const h = Math.min(w, w / aspect);
    ctx.fill(shapePath(shape, Math.min(w, h * aspect), h, shape === "rounded" ? 35 : shape === "bubble" ? 30 : 0));
    ctx.restore();
  }, [shape]);
  return <canvas ref={ref} width={96} height={96} className="size-full" aria-hidden />;
}

/** A small looping preview of an animated sticker (still when the user prefers less motion). */
function AnimatedThumb({ id, color }: { id: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      drawAnimated(ctx, id, color, c.width * 0.8, reduce ? 0 : (now - start) / 1000);
      ctx.restore();
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [id, color]);
  return <canvas ref={ref} width={112} height={112} className="size-full" aria-hidden />;
}

function CollageEditor({
  state,
  update,
  assets,
  onPickCell,
}: {
  state: PostState;
  update: Update;
  assets: Assets;
  onPickCell: (index: number) => void;
}) {
  const grid = state.grid!;
  const layout = gridLayout(grid.layout);
  const set = (p: Partial<CollageGrid>, key?: string) =>
    update((s) => (s.grid ? { ...s, grid: { ...s.grid, ...p } } : s), key);
  return (
    <PanelSection
      title="Collage"
      className="bg-aqua-wash/40"
      action={
        <Button
          variant="ghost"
          size="xs"
          className="text-destructive hover:text-destructive"
          onClick={() => update((s) => ({ ...s, grid: null }), "grid:remove")}
        >
          Remove
        </Button>
      }
    >
      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl bg-tile">
        {layout.cells.map(([x, y, w, h], i) => {
          const id = grid.cells[i];
          const img = id ? assets[id] : undefined;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPickCell(i)}
              aria-label={img ? `Replace photo ${i + 1}` : `Add photo ${i + 1}`}
              className="group absolute grid place-items-center overflow-hidden rounded-md bg-sheet ring-1 ring-rule outline-none hover:ring-brand focus-visible:ring-2 focus-visible:ring-aqua"
              style={cellStyle(x, y, w, h, 3)}
            >
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt="" className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Replace
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-soft">
                  <ImagePlus className="size-4 text-brand" /> Add
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4">
        <RangeField label="Spacing" value={grid.gap} min={0} max={60} format={(v) => `${v} px`} onChange={(v) => set({ gap: v }, "grid:gap")} />
        <RangeField label="Corner rounding" value={grid.radius} min={0} max={80} format={(v) => `${v} px`} onChange={(v) => set({ radius: v }, "grid:radius")} />
        <p className="text-xs text-pretty text-ink-soft">The spacing shows the background colour; change it under Photo.</p>
      </div>
    </PanelSection>
  );
}

function StickerEditor({
  sticker,
  state,
  update,
  onSelect,
}: {
  sticker: Sticker;
  state: PostState;
  update: Update;
  onSelect: (id: string | null) => void;
}) {
  const id = sticker.id;
  const patch = (p: Partial<Sticker>, key?: string) =>
    update((s) => ({ ...s, stickers: s.stickers.map((x) => (x.id === id ? { ...x, ...p } : x)) }), key);
  const move = (dir: 1 | -1) => update((s) => restack(s, id, dir));
  const duplicate = () => {
    const copy = { ...sticker, id: crypto.randomUUID(), z: nextZ(state), x: Math.min(0.95, sticker.x + 0.04), y: Math.min(0.95, sticker.y + 0.04) };
    update((s) => ({ ...s, stickers: [...s.stickers, copy] }));
    onSelect(copy.id);
  };
  const remove = () => {
    update((s) => ({ ...s, stickers: s.stickers.filter((x) => x.id !== id) }));
    onSelect(null);
  };
  const title = { emoji: "Emoji", icon: "Icon", image: "Sticker", shape: "Shape", animated: "Animated sticker", gif: "GIF" }[sticker.kind];

  return (
    <PanelSection
      title={`Edit ${title.toLowerCase()}`}
      className="bg-aqua-wash/40"
      action={
        <div className="flex gap-0.5">
          <IconAction label="Bring forward" onClick={() => move(1)}><ArrowUp /></IconAction>
          <IconAction label="Send backward" onClick={() => move(-1)}><ArrowDown /></IconAction>
          <IconAction label="Duplicate" onClick={duplicate}><Copy /></IconAction>
          <IconAction label="Delete" onClick={remove} destructive><Trash2 /></IconAction>
        </div>
      }
    >
      <div className="grid gap-5">
        {(sticker.kind === "icon" || sticker.kind === "animated") && (
          <ColorField
            label="Colour"
            value={sticker.color}
            onChange={(c) => patch({ color: c }, `color:${id}`)}
          />
        )}
        {sticker.kind === "shape" && (
          <>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">Fill</span>
                <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
                  No fill
                  <Switch
                    size="sm"
                    checked={sticker.fill === "none"}
                    onCheckedChange={(on) => patch({ fill: on ? "none" : sticker.color }, `fill:${id}`)}
                  />
                </label>
              </div>
              {sticker.fill !== "none" && (
                <ColorField
                  label="Fill colour"
                  value={sticker.fill ?? sticker.color}
                  onChange={(c) => patch({ fill: c, color: c }, `fill:${id}`)}
                />
              )}
            </div>
            <div className="grid gap-3">
              <span className="text-[13px] font-medium text-ink">Border</span>
              <RangeField
                label="Border width"
                value={sticker.strokeWidth ?? 0}
                min={0}
                max={60}
                format={(v) => (v ? `${v} px` : "None")}
                onChange={(v) => patch({ strokeWidth: v, stroke: sticker.stroke ?? "#111111" }, `stroke:${id}`)}
              />
              {(sticker.strokeWidth ?? 0) > 0 && (
                <ColorField
                  label="Border colour"
                  value={sticker.stroke ?? "#111111"}
                  onChange={(c) => patch({ stroke: c }, `strokec:${id}`)}
                />
              )}
            </div>
            {sticker.shape && ROUNDABLE.includes(sticker.shape) && (
              <RangeField
                label="Corner radius"
                value={sticker.radius ?? 0}
                min={0}
                max={100}
                format={(v) => `${v}%`}
                onChange={(v) => patch({ radius: v }, `radius:${id}`)}
              />
            )}
            <RangeField
              label="Stretch"
              value={Math.round((sticker.aspect ?? 1) * 100)}
              min={sticker.shape === "line" ? 400 : 25}
              max={sticker.shape === "line" ? 6000 : 400}
              defaultValue={sticker.shape === "line" ? 2600 : 100}
              format={(v) => (v === 100 ? "Even" : v > 100 ? `${(v / 100).toFixed(1)}× wide` : `${(100 / v).toFixed(1)}× tall`)}
              onChange={(v) => patch({ aspect: v / 100 }, `aspect:${id}`)}
            />
          </>
        )}
        <RangeField label="Size" value={sticker.size} min={24} max={1400} format={(v) => `${v} px`}
          onChange={(v) => patch({ size: v }, `size:${id}`)} />
        <RangeField label="Rotation" value={sticker.rotation} min={-180} max={180} defaultValue={0} centered format={(v) => `${v}°`}
          onChange={(v) => patch({ rotation: v }, `rot:${id}`)} />
        <RangeField label="Opacity" value={sticker.opacity} min={10} max={100} format={(v) => `${v}%`}
          onChange={(v) => patch({ opacity: v }, `op:${id}`)} />
      </div>
    </PanelSection>
  );
}

/* ------------------------------------------------------------------- Blur */

export function BlurPanel({
  state,
  update,
  selectedId,
  onSelect,
  defaults,
  onDefaults,
}: {
  state: PostState;
  update: Update;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  defaults: RegionDefaults;
  onDefaults: (d: RegionDefaults) => void;
}) {
  const region = state.regions.find((r) => r.id === selectedId) ?? null;
  const current: RegionDefaults = region ?? defaults;

  // Settings apply to the selected area and become the default for the next one.
  const set = (p: Partial<RegionDefaults>, key?: string) => {
    onDefaults({ ...current, ...p });
    if (region) update((s) => ({ ...s, regions: s.regions.map((r) => (r.id === region.id ? { ...r, ...p } : r)) }), key);
  };
  const remove = (id: string) => {
    update((s) => ({ ...s, regions: s.regions.filter((r) => r.id !== id) }));
    if (id === selectedId) onSelect(null);
  };

  return (
    <>
      <PanelSection title="Blur an area">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Drag over the post to hide a face, a number plate or an old price. Text and stickers stay sharp.
        </p>
        <p className="-mt-2 mb-4 text-xs text-pretty text-ink-soft">
          Drag an area to move it, or pull a corner to resize. With an area selected, use the arrow keys to move it
          and <kbd className="font-mono">Alt</kbd> + arrows to resize. Hold <kbd className="font-mono">Shift</kbd> for
          bigger steps.
        </p>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-[13px] text-ink-soft">Effect</span>
            <ToggleGroup variant="outline" size="sm" spacing={0} value={[current.kind]} className="w-full"
              onValueChange={(v) => v[0] && set({ kind: v[0] as Region["kind"] })} aria-label="Effect">
              <ToggleGroupItem value="blur" className="flex-1"><Droplets /> Blur</ToggleGroupItem>
              <ToggleGroupItem value="pixelate" className="flex-1"><Grid3x3 /> Pixelate</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid gap-2">
            <span className="text-[13px] text-ink-soft">Shape</span>
            <ToggleGroup variant="outline" size="sm" spacing={0} value={[current.shape]} className="w-full"
              onValueChange={(v) => v[0] && set({ shape: v[0] as Region["shape"] })} aria-label="Shape">
              <ToggleGroupItem value="rect" className="flex-1"><Square /> Rectangle</ToggleGroupItem>
              <ToggleGroupItem value="ellipse" className="flex-1"><Circle /> Oval</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <RangeField label="Strength" value={current.strength} min={0} max={100} format={(v) => `${v}%`}
            onChange={(v) => set({ strength: v }, region ? `region:strength:${region.id}` : undefined)} />
        </div>
      </PanelSection>

      {state.regions.length > 0 && (
        <PanelSection
          title="Areas on this post"
          action={
            <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive"
              onClick={() => { update((s) => ({ ...s, regions: [] })); onSelect(null); }}>
              Remove all
            </Button>
          }
        >
          <ul className="grid gap-1">
            {state.regions.map((r, i) => (
              <li key={r.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={r.id === selectedId}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                    r.id === selectedId ? "bg-aqua-wash text-ink" : "text-ink-soft hover:bg-muted hover:text-ink",
                  )}
                >
                  {r.kind === "blur" ? <Droplets className="size-3.5" /> : <Grid3x3 className="size-3.5" />}
                  {r.kind === "blur" ? "Blur" : "Pixelate"} {i + 1}
                  <span className="ml-auto font-mono text-[11px] text-ink-soft tabular">{r.strength}%</span>
                </button>
                <IconAction label={`Remove area ${i + 1}`} onClick={() => remove(r.id)} destructive><Trash2 /></IconAction>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </>
  );
}

