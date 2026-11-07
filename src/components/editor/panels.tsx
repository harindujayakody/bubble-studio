"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Check,
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
import { FILTER_GROUPS, FILTER_PRESETS, type FilterGroup } from "@/lib/editor/filters";
import { GRADIENT_PRESETS, SOLID_PRESETS, gradientCss } from "@/lib/editor/palettes";
import { POSTER_FONTS, fontStack, getFont, nearestWeight } from "@/lib/editor/fonts";
import { useBrand } from "@/lib/editor/brand";
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
  type TextAnimationType,
  type TextEffectType,
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
            <Button onClick={onPickPhoto} className="w-fit">
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
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-tile p-1" role="tablist" aria-label="Background type">
          {(["solid", "gradient"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={bg.kind === k}
              onClick={() => setBg({ kind: k }, "bg:kind")}
              className={cn(
                "h-8 rounded-md text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                bg.kind === k ? "bg-sheet text-ink shadow-float" : "text-ink-soft hover:text-ink",
              )}
            >
              {k === "solid" ? "Solid colour" : "Gradient"}
            </button>
          ))}
        </div>
        {bg.kind === "solid" && (
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-ink-soft">Presets</span>
              <span className="text-xs text-ink-soft">
                {SOLID_PRESETS.find((c) => c.hex === bg.from.toLowerCase())?.name ?? "Custom"}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Solid colour presets">
              {SOLID_PRESETS.map((c) => {
                const active = bg.from.toLowerCase() === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setBg({ kind: "solid", from: c.hex, stops: undefined, preset: undefined }, "bg:from")}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md ring-1 ring-ink/10 ring-inset outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-aqua",
                      active && "ring-2 ring-aqua ring-offset-2 ring-offset-sheet",
                    )}
                    style={{ background: c.hex }}
                  >
                    {active && <Check className={cn("size-4", ["#ffffff", "#f2f3f5", "#f4efe6", "#fff3b0", "#d8f3dc", "#bde0fe", "#ffc8dd", "#ffd93d", "#cdb4db"].includes(c.hex) ? "text-[#111]" : "text-white")} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            label={bg.kind === "gradient" ? "Start colour" : "Custom colour"}
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
  const [category, setCategory] = useState<"all" | FilterGroup>("all");

  // Re-render previews whenever the photo or its framing changes.
  useEffect(() => {
    if (!source) return;
    const size = 144;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round(size / postDims(state).aspect);
    const ctx = canvas.getContext("2d")!;
    const base = { ...state, texts: [], stickers: [], grid: null };
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

  const groups = category === "all" ? FILTER_GROUPS : FILTER_GROUPS.filter((g) => g.id === category);
  const current = FILTER_PRESETS.find((p) => p.id === state.filter) ?? FILTER_PRESETS[0];
  const pick = (id: string) =>
    update((s) => ({ ...s, filter: id, filterStrength: s.filter === id ? s.filterStrength : 100 }));

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-rule bg-sheet px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-[14px] font-semibold text-ink">Filters</h3>
          <span className="truncate text-xs text-ink-soft">
            {current.id === "original" ? "None applied" : current.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter groups">
          {(["all", ...FILTER_GROUPS.map((g) => g.id)] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              onClick={() => setCategory(id)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                category === id ? "bg-ink text-sheet" : "bg-tile text-ink hover:bg-brand-wash",
              )}
            >
              {id === "all" ? "All" : FILTER_GROUPS.find((g) => g.id === id)!.label}
            </button>
          ))}
        </div>
        {state.filter !== "original" && (
          <div className="mt-3">
            <RangeField
              label="Strength"
              value={state.filterStrength}
              min={0}
              max={100}
              defaultValue={100}
              format={(v) => `${v}%`}
              onChange={(v) => update((s) => ({ ...s, filterStrength: v }), "filter:strength")}
            />
          </div>
        )}
      </div>

      {groups.map((group) => {
        const presets = FILTER_PRESETS.filter(
          (p) => (p.group ?? "classic") === group.id,
        );
        return (
          <section key={group.id} className="border-b border-rule px-4 pt-4 pb-5 last:border-b-0">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h4 className="text-[13px] font-semibold text-ink">{group.label}</h4>
              <span className="text-[11px] text-ink-soft">{group.note}</span>
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-3" role="radiogroup" aria-label={`${group.label} filters`}>
              {presets.map((p) => {
                const active = state.filter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(p.id)}
                    className="group grid gap-1.5 text-left outline-none"
                  >
                    <span
                      className={cn(
                        "relative block aspect-square overflow-hidden rounded-lg bg-tile ring-1 ring-ink/10 transition-shadow",
                        active
                          ? "ring-2 ring-aqua ring-offset-2 ring-offset-sheet"
                          : "group-hover:ring-ink/30 group-focus-visible:ring-2 group-focus-visible:ring-aqua",
                      )}
                    >
                      {thumbs[p.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[p.id]} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      )}
                      {active && (
                        <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-aqua text-white shadow-float">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className={cn("truncate text-xs", active ? "font-semibold text-aqua-ink" : "text-ink-soft")}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

const TEXT_EFFECTS: { id: TextEffectType; label: string; amount: number; color: string }[] = [
  { id: "none", label: "None", amount: 0, color: "#ffffff" },
  { id: "curve", label: "Curve", amount: 45, color: "#ffffff" },
  { id: "glow", label: "Glow", amount: 45, color: "#ffd60a" },
  { id: "neon", label: "Neon", amount: 55, color: "#ff3df0" },
  { id: "hollow", label: "Hollow", amount: 35, color: "#ffffff" },
  { id: "gradient", label: "Gradient", amount: 0, color: "#00c4cc" },
  { id: "echo", label: "Echo", amount: 45, color: "#ff3d6e" },
];

/** A small "Aa" showing the effect, drawn with CSS so it needs no canvas. */
function EffectPreview({ id, color }: { id: TextEffectType; color: string }) {
  const base = "font-heading text-[17px] leading-none font-bold";
  if (id === "curve") {
    return (
      <svg viewBox="0 0 60 30" className="h-7 w-14" aria-hidden>
        <path id="fx-arc" d="M6 26 Q30 2 54 26" fill="none" />
        <text fontSize="12" fontWeight="700" fill="#fff" fontFamily="Poppins, sans-serif">
          <textPath href="#fx-arc" startOffset="50%" textAnchor="middle">Curve</textPath>
        </text>
      </svg>
    );
  }
  const style: React.CSSProperties =
    id === "glow"
      ? { color: "#fff", textShadow: `0 0 6px ${color}, 0 0 12px ${color}` }
      : id === "neon"
        ? { color: "#fff", textShadow: `0 0 3px ${color}, 0 0 8px ${color}, 0 0 14px ${color}` }
        : id === "hollow"
          ? { color: "transparent", WebkitTextStroke: "1.4px #fff" }
          : id === "gradient"
            ? { backgroundImage: `linear-gradient(90deg, #ffffff, ${color})`, WebkitBackgroundClip: "text", color: "transparent" }
            : id === "echo"
              ? { color: "#fff", textShadow: `2px 2px 0 ${color}cc, 4px 4px 0 ${color}80, 6px 6px 0 ${color}40` }
              : { color: "#fff" };
  return (
    <span className={base} style={style} aria-hidden>
      Aa
    </span>
  );
}

const TEXT_ANIMATIONS: { id: TextAnimationType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "pop", label: "Pop" },
  { id: "slide", label: "Slide up" },
  { id: "typewriter", label: "Type" },
  { id: "wobble", label: "Wobble" },
  { id: "bounce", label: "Bounce" },
  { id: "pulse", label: "Pulse" },
];

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
  const brand = useBrand();
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
            {[...state.texts].sort((a, b) => b.z - a.z).map((t) => (
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
                  {(brand.headingFont || brand.bodyFont) && (
                    <SelectGroup>
                      <SelectLabel>Brand fonts</SelectLabel>
                      {[...new Set([brand.headingFont, brand.bodyFont].filter((f): f is string => !!f))].map((f) => (
                        <SelectItem key={`brand-${f}`} value={f}>
                          <span style={{ fontFamily: fontStack(f), fontSize: 16 }}>{f}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
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

          {state.media === "video" && (
            <PanelSection title="Animation">
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Text animation">
                {TEXT_ANIMATIONS.map((a) => {
                  const on = (layer.anim?.type ?? "none") === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => patch({ anim: { type: a.id, speed: layer.anim?.speed ?? 1 } })}
                      className={cn(
                        "h-9 rounded-lg border text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                        on ? "border-brand bg-brand-wash text-brand" : "border-rule text-ink hover:bg-tile",
                      )}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {layer.anim && layer.anim.type !== "none" && (
                <div className="mt-4">
                  <RangeField
                    label="Speed"
                    value={Math.round(layer.anim.speed * 100)}
                    min={50}
                    max={300}
                    step={10}
                    defaultValue={100}
                    format={(v) => `${(v / 100).toFixed(1)}×`}
                    onChange={(v) => patch({ anim: { type: layer.anim!.type, speed: v / 100 } }, `anim:${layer.id}`)}
                  />
                </div>
              )}
              <p className="mt-3 text-xs text-pretty text-ink-soft">Plays when the text appears in your reel, and in the export.</p>
            </PanelSection>
          )}

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

          <PanelSection title="Effects">
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Text effect">
              {TEXT_EFFECTS.map((fx) => {
                const on = (layer.effect?.type ?? "none") === fx.id;
                return (
                  <button
                    key={fx.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    title={fx.label}
                    onClick={() =>
                      patch({
                        effect: fx.id === "none" ? undefined : { type: fx.id, amount: fx.amount, color: fx.color },
                      })
                    }
                    className={cn(
                      "grid gap-1 rounded-lg border p-1.5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                      on ? "border-brand bg-brand-wash" : "border-rule hover:bg-tile",
                    )}
                  >
                    <span className="grid h-9 place-items-center overflow-hidden rounded-md bg-[#1b1c22]">
                      <EffectPreview id={fx.id} color={fx.color} />
                    </span>
                    <span className={cn("text-[11px] font-medium", on ? "text-brand" : "text-ink")}>{fx.label}</span>
                  </button>
                );
              })}
            </div>
            {layer.effect && layer.effect.type !== "none" && (
              <div className="mt-4 grid gap-4">
                {layer.effect.type !== "gradient" && (
                  <RangeField
                    label={{ curve: "Curve", glow: "Glow size", neon: "Brightness", hollow: "Thickness", echo: "Distance" }[layer.effect.type]}
                    value={layer.effect.amount}
                    min={layer.effect.type === "curve" ? -100 : 0}
                    max={100}
                    centered={layer.effect.type === "curve"}
                    defaultValue={TEXT_EFFECTS.find((f) => f.id === layer.effect!.type)?.amount}
                    onChange={(v) => patch({ effect: { ...layer.effect!, amount: v } }, `fx:${layer.id}`)}
                  />
                )}
                {["glow", "neon", "gradient", "echo"].includes(layer.effect.type) && (
                  <ColorField
                    label={layer.effect.type === "gradient" ? "Gradient end colour" : "Effect colour"}
                    value={layer.effect.color}
                    onChange={(c) => patch({ effect: { ...layer.effect!, color: c } }, `fxc:${layer.id}`)}
                  />
                )}
                {layer.effect.type === "curve" && (
                  <p className="text-xs text-pretty text-ink-soft">All lines are set on one arc. Drag left for a smile, right for an arch.</p>
                )}
              </div>
            )}
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
