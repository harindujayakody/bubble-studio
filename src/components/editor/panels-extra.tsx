"use client";

import { createElement } from "react";
import { ArrowDown, ArrowUp, Circle, Copy, Grid3x3, Droplets, Square, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ColorField, IconAction, PanelSection, RangeField } from "./controls";
import type { RegionDefaults } from "./canvas-stage";
import { CUSTOM_STICKERS, EMOJI_FONT, STICKER_EMOJI, STICKER_ICONS } from "@/lib/editor/stickers";
import { nextZ, restack } from "@/lib/editor/layers";
import type { Assets } from "@/lib/editor/render";
import type { PostState, Region, Sticker } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;
export type NewSticker = Pick<Sticker, "kind" | "value"> & Partial<Sticker>;

/* --------------------------------------------------------------- Elements */

export function ElementsPanel({
  state,
  update,
  assets,
  selectedId,
  onSelect,
  onAdd,
  onAddCustom,
  onUpload,
}: {
  state: PostState;
  update: Update;
  assets: Assets;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (s: NewSticker) => void;
  onAddCustom: (id: string, src: string) => void;
  onUpload: () => void;
}) {
  const sticker = state.stickers.find((s) => s.id === selectedId) ?? null;

  return (
    <>
      {sticker && (
        <StickerEditor sticker={sticker} state={state} update={update} onSelect={onSelect} />
      )}

      <PanelSection title="Add elements">
        <Tabs defaultValue="stickers">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="stickers">Stickers</TabsTrigger>
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="icons">Icons</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="stickers">
            <div className="grid grid-cols-3 gap-2">
              {CUSTOM_STICKERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Add sticker ${i + 1}`}
                  onClick={() => onAddCustom(c.id, c.src)}
                  className="grid aspect-square place-items-center rounded-md bg-[oklch(0.96_0.004_250)] p-2 outline-none hover:bg-magenta-wash focus-visible:ring-2 focus-visible:ring-cyan"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="emoji">
            <div className="grid grid-cols-6 gap-1">
              {STICKER_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Add ${e}`}
                  onClick={() => onAdd({ kind: "emoji", value: e })}
                  className="grid aspect-square place-items-center rounded-md text-[26px] leading-none outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-cyan"
                  style={{ fontFamily: EMOJI_FONT }}
                >
                  {e}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="icons">
            <div className="grid grid-cols-6 gap-1">
              {Object.entries(STICKER_ICONS).map(([name, node]) => (
                <button
                  key={name}
                  type="button"
                  aria-label={`Add ${name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase()} icon`}
                  onClick={() => onAdd({ kind: "icon", value: name })}
                  className="grid aspect-square place-items-center rounded-md text-ink outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-cyan"
                >
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
                  </svg>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-soft">Icons take any colour once added.</p>
          </TabsContent>

          <TabsContent value="upload">
            <p className="mb-3 text-[13px] text-pretty text-ink-soft">
              Add your logo, a product cut-out or any picture on top of the post. PNGs keep their transparent background.
            </p>
            <Button onClick={onUpload} variant="outline">
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
                      className="checker grid aspect-square place-items-center overflow-hidden rounded-md ring-1 ring-rule outline-none hover:ring-magenta/60 focus-visible:ring-2 focus-visible:ring-cyan"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assets[id].src} alt="" className="max-h-full max-w-full object-contain" />
                    </button>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PanelSection>
    </>
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
  const title = { emoji: "Emoji", icon: "Icon", image: "Sticker" }[sticker.kind];

  return (
    <PanelSection
      title={`Edit ${title.toLowerCase()}`}
      className="bg-cyan-wash/40"
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
        {sticker.kind === "icon" && (
          <ColorField
            label="Colour"
            value={sticker.color}
            onChange={(c) => patch({ color: c }, `color:${id}`)}
          />
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
                    "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                    r.id === selectedId ? "bg-cyan-wash text-ink" : "text-ink-soft hover:bg-muted hover:text-ink",
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

