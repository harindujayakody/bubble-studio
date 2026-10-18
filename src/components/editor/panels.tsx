"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Plus,
  RotateCcw,
  RotateCcwSquare,
  RotateCwSquare,
  Trash2,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorField, IconAction, PanelSection, RangeField } from "./controls";
import { SavedPhrases } from "./phrase-panel";
import { FILTER_PRESETS } from "@/lib/editor/filters";
import { GRADIENT_PRESETS, gradientCss } from "@/lib/editor/palettes";
import { POSTER_FONTS, fontStack, getFont, nearestWeight } from "@/lib/editor/fonts";
import { defaultCrop, postDims, renderPost, type Source } from "@/lib/editor/render";
import { nextZ, restack } from "@/lib/editor/layers";
import { autoOutline } from "@/lib/editor/color";
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_OUTLINE,
  TEXT_STYLES,
  type Adjustments,
  type Background,
  type Crop,
  type Orientation,
  type PostState,
  type TextFill,
  type TextOutline,
  type TextLayer,
  type TextStyleId,
} from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;

/* ------------------------------------------------------------------ Photo */

export function PhotoPanel({
  state,
  update,
  onPickPhoto,
  onRemovePhoto,
}: {
  state: PostState;
  update: Update;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
}) {
  const bg = state.background;
  const setBg = (patch: Partial<Background>, key: string) =>
    update((s) => ({ ...s, background: { ...s.background, ...patch } }), key);

  return (
    <>
      <PanelSection title="Photo">
        {state.photoId ? (
          <div className="grid gap-3">
            <p className="truncate text-sm text-ink" title={state.photoName ?? undefined}>
              {state.photoName}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onPickPhoto}>
                <ImagePlus /> Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={onRemovePhoto} className="text-destructive hover:text-destructive">
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-pretty text-ink-soft">
              Add a photo of your shop, product or event. It stays on your computer.
            </p>
            <Button onClick={onPickPhoto} className="w-fit bg-brand text-white hover:bg-brand-ink">
              <ImagePlus /> Choose photo
            </Button>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Background">
        <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
          {state.photoId
            ? "Shows behind the photo only where it doesn't reach."
            : "Your post's base colour. Add text on top for a quick announcement."}
        </p>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          value={[bg.kind]}
          onValueChange={(v) => v[0] && setBg({ kind: v[0] as Background["kind"] }, "bg:kind")}
          className="mb-4"
        >
          <ToggleGroupItem value="solid" className="px-3">Solid</ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="px-3">Gradient</ToggleGroupItem>
        </ToggleGroup>
        {bg.kind === "gradient" && (
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-ink-soft">Presets</span>
              <span className="text-xs text-ink-soft">{bg.preset ?? "Custom"}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Gradient presets">
              {GRADIENT_PRESETS.map((g) => {
                const active = bg.preset === g.name;
                return (
                  <button
                    key={g.name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={g.name}
                    title={g.name}
                    onClick={() =>
                      setBg({ kind: "gradient", stops: g.stops, preset: g.name, from: g.stops[0], to: g.stops[g.stops.length - 1] }, "bg:preset")
                    }
                    className={cn(
                      "aspect-square rounded-md ring-1 ring-ink/10 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-aqua",
                      active && "ring-2 ring-aqua ring-offset-2 ring-offset-sheet",
                    )}
                    style={{ background: gradientCss(g.stops) }}
                  />
                );
              })}
            </div>
          </div>
        )}
        <div className="grid gap-4">
          <ColorField
            label={bg.kind === "gradient" ? "Start colour" : "Colour"}
            value={bg.from}
            onChange={(c) => setBg({ from: c, stops: undefined, preset: undefined }, "bg:from")}
          />
          {bg.kind === "gradient" && (
            <ColorField
              label="End colour"
              value={bg.to}
              onChange={(c) => setBg({ to: c, stops: undefined, preset: undefined }, "bg:to")}
            />
          )}
        </div>
      </PanelSection>
    </>
  );
}

/* ---------------------------------------------------------------- Filters */

export function FiltersPanel({
  source,
  state,
  update,
}: {
  source: Source | null;
  state: PostState;
  update: Update;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // Re-render previews whenever the photo or its framing changes.
  useEffect(() => {
    if (!source) return;
    const size = 144;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round(size / postDims(state).aspect);
    const ctx = canvas.getContext("2d")!;
    const base = { ...state, texts: [] };
    const next: Record<string, string> = {};
    const id = requestAnimationFrame(() => {
      for (const p of FILTER_PRESETS) {
        renderPost(ctx, {
          source,
          state: base,
          width: size,
          withText: false,
          lookOverride: { filter: p.id, strength: 100, neutralAdjust: true },
        });
        next[p.id] = canvas.toDataURL("image/jpeg", 0.8);
      }
      setThumbs(next);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, state.crop, state.size]);

  if (!source) return <NeedsPhoto what="Filters" />;

  return (
    <>
      {(["classic", "famous"] as const).map((group) => {
        const label = group === "classic" ? "Filters" : "Famous filters";
        return (
          <PanelSection key={group} title={label}>
            <div className="grid grid-cols-3 gap-x-2 gap-y-3" role="radiogroup" aria-label={label}>
              {FILTER_PRESETS.filter((p) => (p.group ?? "classic") === group).map((p) => {
                const active = state.filter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => update((s) => ({ ...s, filter: p.id, filterStrength: s.filter === p.id ? s.filterStrength : 100 }))}
                    className="group grid gap-1.5 text-left outline-none"
                  >
                    <span
                      className={cn(
                        "block aspect-square overflow-hidden rounded-[3px] bg-muted ring-1 ring-ink/10 transition-shadow",
                        active ? "ring-2 ring-aqua ring-offset-2 ring-offset-sheet" : "group-hover:ring-ink/30 group-focus-visible:ring-2 group-focus-visible:ring-aqua",
                      )}
                    >
                      {thumbs[p.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[p.id]} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className={cn("text-xs", active ? "font-semibold text-aqua-ink" : "text-ink-soft")}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </PanelSection>
        );
      })}
      {state.filter !== "original" && (
        <PanelSection title="Strength">
          <RangeField
            label="Amount"
            value={state.filterStrength}
            min={0}
            max={100}
            defaultValue={100}
            format={(v) => `${v}%`}
            onChange={(v) => update((s) => ({ ...s, filterStrength: v }), "filter:strength")}
          />
        </PanelSection>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- Adjust */

const ADJUST_FIELDS: { key: keyof Adjustments; label: string; min: number; max: number }[] = [
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "warmth", label: "Warmth", min: -100, max: 100 },
  { key: "fade", label: "Fade", min: 0, max: 100 },
  { key: "vignette", label: "Vignette", min: 0, max: 100 },
  { key: "blur", label: "Blur", min: 0, max: 100 },
];

export function AdjustPanel({ source, state, update }: { source: Source | null; state: PostState; update: Update }) {
  if (!source) return <NeedsPhoto what="Adjustments" />;
  const dirty = ADJUST_FIELDS.some((f) => state.adjust[f.key] !== DEFAULT_ADJUSTMENTS[f.key]);
  return (
    <PanelSection
      title="Adjust"
      action={
        <Button
          variant="ghost"
          size="xs"
          disabled={!dirty}
          onClick={() => update((s) => ({ ...s, adjust: DEFAULT_ADJUSTMENTS }))}
        >
          <RotateCcw /> Reset all
        </Button>
      }
    >
      <div className="grid gap-5">
        {ADJUST_FIELDS.map((f) => (
          <RangeField
            key={f.key}
            label={f.label}
            value={state.adjust[f.key]}
            min={f.min}
            max={f.max}
            centered={f.min < 0}
            defaultValue={0}
            onChange={(v) => update((s) => ({ ...s, adjust: { ...s.adjust, [f.key]: v } }), `adjust:${f.key}`)}
          />
        ))}
      </div>
      <p className="mt-5 text-xs text-ink-soft">Double-click a label to reset it.</p>
    </PanelSection>
  );
}

/* ------------------------------------------------------------------- Crop */

export function CropPanel({
  source,
  state,
  update,
  onOrient,
}: {
  source: Source | null;
  state: PostState;
  update: Update;
  onOrient: (o: Orientation) => void;
}) {
  if (!source) return <NeedsPhoto what="Crop" />;
  const ar = postDims(state).aspect;
  const crop = state.crop ?? defaultCrop(source.width, source.height, ar);
  const maxSize = Math.min(source.width, source.height * ar);
  const zoom = Math.round((maxSize / crop.size) * 100);
  const o = state.orientation;

  const setZoom = (z: number) => {
    const size = maxSize / (z / 100);
    const cx = crop.x + crop.size / 2;
    const cy = crop.y + crop.size / ar / 2;
    const next: Crop = {
      size,
      x: Math.min(Math.max(0, cx - size / 2), source.width - size),
      y: Math.min(Math.max(0, cy - size / ar / 2), source.height - size / ar),
    };
    update((s) => ({ ...s, crop: next }), "crop:zoom");
  };

  const rotate = (dir: 1 | -1) =>
    onOrient({ ...o, rotation: (((o.rotation + dir * 90) % 360) + 360) % 360 as Orientation["rotation"] });

  return (
    <>
      <PanelSection title="Crop">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Drag the yellow frame to choose what shows. Pull a corner to zoom in.
        </p>
        <RangeField
          label="Zoom"
          value={zoom}
          min={100}
          max={400}
          defaultValue={100}
          format={(v) => `${v}%`}
          onChange={setZoom}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={!state.crop}
          onClick={() => update((s) => ({ ...s, crop: null }))}
        >
          <RotateCcw /> Reset crop
        </Button>
      </PanelSection>
      <PanelSection title="Rotate and flip">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => rotate(-1)}>
            <RotateCcwSquare /> Rotate left
          </Button>
          <Button variant="outline" size="sm" onClick={() => rotate(1)}>
            <RotateCwSquare /> Rotate right
          </Button>
          <Toggle variant="outline" size="sm" pressed={o.flipX} onPressedChange={(v) => onOrient({ ...o, flipX: v })}>
            <FlipHorizontal2 /> Mirror
          </Toggle>
          <Toggle variant="outline" size="sm" pressed={o.flipY} onPressedChange={(v) => onOrient({ ...o, flipY: v })}>
            <FlipVertical2 /> Flip
          </Toggle>
        </div>
      </PanelSection>
    </>
  );
}

/* ------------------------------------------------------------------- Text */

export function TextPanel({
  state,
  update,
  selectedId,
  onSelect,
  onAdd,
  textareaRef,
}: {
  state: PostState;
  update: Update;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (style: TextStyleId, text?: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const layer = state.texts.find((t) => t.id === selectedId) ?? null;
  const patch = (p: Partial<TextLayer>, key?: string) =>
    layer && update((s) => ({ ...s, texts: s.texts.map((t) => (t.id === layer.id ? { ...t, ...p } : t)) }), key);

  const patchFill = (p: Partial<TextFill>, key?: string) => layer && patch({ fill: { ...layer.fill, ...p } }, key);

  const move = (dir: 1 | -1) => layer && update((s) => restack(s, layer.id, dir));

  const duplicate = () => {
    if (!layer) return;
    const copy = { ...layer, id: crypto.randomUUID(), z: nextZ(state), x: Math.min(0.95, layer.x + 0.03), y: Math.min(0.95, layer.y + 0.03) };
    update((s) => ({ ...s, texts: [...s.texts, copy] }));
    onSelect(copy.id);
  };

  const remove = () => {
    if (!layer) return;
    update((s) => ({ ...s, texts: s.texts.filter((t) => t.id !== layer.id) }));
    onSelect(null);
  };

  const font = layer ? getFont(layer.fontFamily) : null;

  return (
    <>
      <PanelSection title="Add text">
        <div className="grid gap-1.5">
          {(Object.keys(TEXT_STYLES) as TextStyleId[]).map((id) => {
            const st = TEXT_STYLES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onAdd(id)}
                className="flex h-12 items-center justify-between rounded-md border border-rule bg-sheet px-3 text-left text-ink transition-colors outline-none hover:border-brand/50 hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
              >
                <span
                  className="truncate"
                  style={{
                    fontFamily: fontStack(st.fontFamily),
                    fontWeight: st.fontWeight,
                    fontSize: id === "headline" ? 22 : id === "subheading" || id === "sinhala" ? 17 : 14,
                    textTransform: st.uppercase ? "uppercase" : "none",
                    letterSpacing: `${st.letterSpacing / 100}em`,
                  }}
                >
                  {st.label}
                </span>
                <Plus className="size-4 shrink-0 text-ink-soft" />
              </button>
            );
          })}
        </div>
      </PanelSection>

      <SavedPhrases onAdd={onAdd} />

      {state.texts.length > 0 && (
        <PanelSection title="Text on this post">
          <ul className="grid gap-1">
            {[...state.texts].reverse().map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  aria-current={t.id === selectedId}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                    t.id === selectedId ? "bg-aqua-wash text-ink" : "text-ink-soft hover:bg-muted hover:text-ink",
                  )}
                >
                  <Type className="size-3.5 shrink-0 text-brand" />
                  <span className="truncate">{t.text.trim() || "Empty text"}</span>
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {layer && font && (
        <>
          <PanelSection
            title="Edit text"
            action={
              <div className="flex gap-0.5">
                <IconAction label="Bring forward" onClick={() => move(1)}><ArrowUp /></IconAction>
                <IconAction label="Send backward" onClick={() => move(-1)}><ArrowDown /></IconAction>
                <IconAction label="Duplicate" onClick={duplicate}><Copy /></IconAction>
                <IconAction label="Delete" onClick={remove} destructive><Trash2 /></IconAction>
              </div>
            }
          >
            <Textarea
              ref={textareaRef}
              value={layer.text}
              onChange={(e) => patch({ text: e.target.value }, `text:${layer.id}`)}
              rows={3}
              placeholder="Type your text"
              className="mb-4 resize-none bg-sheet text-[15px]"
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Select
                value={layer.fontFamily}
                onValueChange={(v) =>
                  v && patch({ fontFamily: v as string, fontWeight: nearestWeight(v as string, layer.fontWeight) })
                }
              >
                <SelectTrigger className="w-full bg-sheet" aria-label="Font">
                  <SelectValue>
                    {(v: string) => <span style={{ fontFamily: fontStack(v) }}>{v}</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {(["latin", "sinhala"] as const).map((script) => (
                    <SelectGroup key={script}>
                      <SelectLabel>{script === "latin" ? "English" : "සිංහල · Sinhala"}</SelectLabel>
                      {POSTER_FONTS.filter((f) => f.script === script).map((f) => (
                        <SelectItem key={f.family} value={f.family}>
                          <span className="flex items-baseline gap-2" style={{ fontFamily: `"${f.family}"`, fontSize: 16 }}>
                            {f.label}
                            {script === "sinhala" && <span className="text-ink-soft">අකුරු</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {font.weights.length > 1 ? (
                <Select value={String(layer.fontWeight)} onValueChange={(v) => v && patch({ fontWeight: Number(v) })}>
                  <SelectTrigger className="w-28 bg-sheet" aria-label="Weight">
                    <SelectValue>{(v: string) => WEIGHT_NAMES[Number(v)] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {font.weights.map((w) => (
                      <SelectItem key={w} value={String(w)}>{WEIGHT_NAMES[w] ?? w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex h-8 w-28 items-center px-2.5 text-sm text-ink-soft">Regular</span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                value={[layer.align]}
                onValueChange={(v) => v[0] && patch({ align: v[0] as TextLayer["align"] })}
                aria-label="Alignment"
              >
                <ToggleGroupItem value="left" aria-label="Align left"><AlignLeft /></ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align centre"><AlignCenter /></ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align right"><AlignRight /></ToggleGroupItem>
              </ToggleGroup>
              <Toggle
                variant="outline"
                size="sm"
                pressed={layer.uppercase}
                onPressedChange={(v) => patch({ uppercase: v })}
                aria-label="All capitals"
                className="px-3 font-semibold"
              >
                AA
              </Toggle>
            </div>
          </PanelSection>

          <PanelSection title="Size and spacing">
            <div className="grid gap-5">
              <RangeField label="Size" value={layer.fontSize} min={12} max={400} format={(v) => `${v} px`}
                onChange={(v) => patch({ fontSize: v }, `size:${layer.id}`)} />
              <RangeField label="Text box width" value={Math.round(layer.width * 100)} min={20} max={100} format={(v) => `${v}%`}
                onChange={(v) => patch({ width: v / 100 }, `width:${layer.id}`)} />
              <RangeField label="Letter spacing" value={layer.letterSpacing} min={-10} max={50} defaultValue={0} centered
                onChange={(v) => patch({ letterSpacing: v }, `ls:${layer.id}`)} />
              <RangeField label="Line height" value={Math.round(layer.lineHeight * 100)} min={70} max={200} format={(v) => (v / 100).toFixed(2)}
                onChange={(v) => patch({ lineHeight: v / 100 }, `lh:${layer.id}`)} />
              <RangeField label="Rotation" value={layer.rotation} min={-45} max={45} defaultValue={0} centered format={(v) => `${v}°`}
                onChange={(v) => patch({ rotation: v }, `rot:${layer.id}`)} />
            </div>
          </PanelSection>

          <PanelSection title="Colour and effects">
            <div className="grid gap-5">
              <ColorField label="Text colour" value={layer.color} onChange={(c) => patch({ color: c }, `color:${layer.id}`)} />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-soft">Drop shadow</span>
                <Toggle variant="outline" size="sm" pressed={layer.shadow} onPressedChange={(v) => patch({ shadow: v })} className="min-w-14">
                  {layer.shadow ? "On" : "Off"}
                </Toggle>
              </div>
            </div>
          </PanelSection>

          <PanelSection title="Outline">
            {(() => {
              const outline = layer.outline ?? DEFAULT_OUTLINE;
              const auto = autoOutline(layer.color);
              const setOutline = (p: Partial<TextOutline>, key?: string) =>
                patch({ outline: { ...outline, ...p } }, key);
              return (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-pretty text-ink-soft">
                      A border around the letters so they stand out on any photo.
                    </span>
                    <Toggle
                      variant="outline"
                      size="sm"
                      pressed={outline.on}
                      onPressedChange={(v) => setOutline({ on: v })}
                      className="min-w-14"
                      aria-label="Text outline"
                    >
                      {outline.on ? "On" : "Off"}
                    </Toggle>
                  </div>
                  {outline.on && (
                    <>
                      <RangeField
                        label="Thickness"
                        value={outline.width}
                        min={5}
                        max={100}
                        format={(v) => `${v}%`}
                        onChange={(v) => setOutline({ width: v }, `outline:w:${layer.id}`)}
                      />
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-ink-soft">Colour</span>
                          <Toggle
                            variant="outline"
                            size="sm"
                            pressed={outline.color === "auto"}
                            onPressedChange={(v) => setOutline({ color: v ? "auto" : auto })}
                            className="gap-2 px-2.5"
                          >
                            <span
                              aria-hidden
                              className="size-3.5 rounded-[3px] ring-1 ring-ink/20"
                              style={{ background: auto }}
                            />
                            Auto
                          </Toggle>
                        </div>
                        <p className="text-xs text-pretty text-ink-soft">
                          {outline.color === "auto"
                            ? `Auto picks ${auto === "#000000" ? "black" : "white"}, the stronger contrast for this text colour.`
                            : "Using your own colour. Turn Auto back on to match the text colour."}
                        </p>
                        {outline.color !== "auto" && (
                          <ColorField
                            label="Outline colour"
                            value={outline.color}
                            onChange={(c) => setOutline({ color: c }, `outline:c:${layer.id}`)}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </PanelSection>

          <PanelSection title="Background fill">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[layer.fill.mode]}
              onValueChange={(v) => {
                const mode = v[0] as TextFill["mode"] | undefined;
                if (!mode) return;
                // Pick a fill that contrasts with the text the first time it is switched on.
                const color =
                  layer.fill.mode === "none" && layer.fill.color.toLowerCase() === layer.color.toLowerCase()
                    ? layer.color.toLowerCase() === "#ffffff" ? "#7d2ae8" : "#ffffff"
                    : layer.fill.color;
                patch({ fill: { ...layer.fill, mode, color } });
              }}
              className="mb-4 w-full"
              aria-label="Background fill"
            >
              <ToggleGroupItem value="none" className="flex-1">None</ToggleGroupItem>
              <ToggleGroupItem value="box" className="flex-1">Box</ToggleGroupItem>
              <ToggleGroupItem value="lines" className="flex-1">Each line</ToggleGroupItem>
            </ToggleGroup>
            {layer.fill.mode === "none" ? (
              <p className="text-[13px] text-pretty text-ink-soft">
                Put a solid colour behind the text so it reads clearly on a busy photo.
              </p>
            ) : (
              <div className="grid gap-5">
                <ColorField label="Fill colour" value={layer.fill.color} onChange={(c) => patchFill({ color: c }, `fill:color:${layer.id}`)} />
                <RangeField label="Opacity" value={layer.fill.opacity} min={10} max={100} format={(v) => `${v}%`}
                  onChange={(v) => patchFill({ opacity: v }, `fill:op:${layer.id}`)} />
                <RangeField label="Rounded corners" value={layer.fill.radius} min={0} max={100} format={(v) => `${v}%`}
                  onChange={(v) => patchFill({ radius: v }, `fill:r:${layer.id}`)} />
                <RangeField label="Padding" value={layer.fill.padding} min={0} max={100}
                  onChange={(v) => patchFill({ padding: v }, `fill:pad:${layer.id}`)} />
              </div>
            )}
          </PanelSection>
        </>
      )}

      {!layer && state.texts.length > 0 && (
        <p className="px-4 py-4 text-[13px] text-ink-soft">Select text on the post to edit it.</p>
      )}
    </>
  );
}

const WEIGHT_NAMES: Record<number, string> = {
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};


function NeedsPhoto({ what }: { what: string }) {
  return (
    <PanelSection title={what}>
      <p className="text-sm text-pretty text-ink-soft">
        Add a photo first. These tools change the picture, not the background colour.
      </p>
    </PanelSection>
  );
}
