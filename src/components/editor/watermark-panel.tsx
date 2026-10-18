"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PanelSection, RangeField } from "./controls";
import {
  logoFromFile,
  setWatermark,
  useWatermark,
  type Watermark,
  type WatermarkPosition,
  type WatermarkStyle,
} from "@/lib/editor/watermark";

const STYLES: { id: WatermarkStyle; label: string; hint: string }[] = [
  { id: "shot", label: "Shot on", hint: "Two lines, like a phone camera" },
  { id: "badge", label: "Badge", hint: "On a soft pill" },
  { id: "minimal", label: "Minimal", hint: "One spaced-out line" },
];

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "tl", label: "Top left" },
  { id: "tr", label: "Top right" },
  { id: "bl", label: "Bottom left" },
  { id: "bc", label: "Bottom centre" },
  { id: "br", label: "Bottom right" },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="grid gap-1 rounded-lg bg-tile p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-8 rounded-md px-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
            value === o.id ? "bg-sheet text-ink shadow-float" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Watermark settings. They are saved in this browser and apply to every export until turned
 * off, so they live with the photo/video tool rather than in one design.
 */
export function WatermarkSection() {
  const wm = useWatermark();
  const logoInput = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Watermark>) => setWatermark(p);

  return (
    <PanelSection
      title="Watermark"
      action={<Switch checked={wm.on} onCheckedChange={(on) => set({ on })} aria-label="Add a watermark to exports" />}
    >
      <p className="-mt-1 text-[13px] text-pretty text-ink-soft">
        {wm.on
          ? "Added to every export until you turn it off, like “Shot on” on phone photos."
          : "Sign your work with a “Shot on” line or your logo. It stays on for every export once turned on."}
      </p>

      {wm.on && (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-[13px] text-ink-soft">Add to</span>
            <Segmented
              label="Add the watermark to"
              value={wm.applyTo}
              onChange={(applyTo) => set({ applyTo })}
              options={[
                { id: "reels", label: "Reels" },
                { id: "photos", label: "Photos" },
                { id: "both", label: "Both" },
              ]}
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] text-ink-soft">Style</span>
            <Segmented label="Watermark style" value={wm.style} onChange={(style) => set({ style })} options={STYLES} />
          </div>

          <div className="grid gap-2">
            <label htmlFor="wm-line1" className="text-[13px] text-ink-soft">
              Text
            </label>
            <Input id="wm-line1" value={wm.line1} maxLength={40} placeholder="Shot on Bubble Studio" onChange={(e) => set({ line1: e.target.value })} />
            {wm.style !== "minimal" && (
              <Input value={wm.line2} maxLength={48} placeholder="Second line, e.g. your name or shop" aria-label="Second line" onChange={(e) => set({ line2: e.target.value })} />
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-soft">Logo</span>
              <Switch size="sm" checked={wm.useLogo} onCheckedChange={(useLogo) => set({ useLogo })} aria-label="Show a logo" />
            </div>
            {wm.useLogo && (
              <div className="flex items-center gap-3">
                <span className="checker grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-rule">
                  {wm.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wm.logo} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImagePlus className="size-4 text-ink-soft" />
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
                  {wm.logo ? "Change logo" : "Upload logo"}
                </Button>
                {wm.logo && (
                  <Button variant="ghost" size="icon-sm" aria-label="Remove logo" onClick={() => set({ logo: null })} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 />
                  </Button>
                )}
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      set({ logo: await logoFromFile(f), useLogo: true });
                    } catch {
                      toast.error("That logo couldn't be opened", { description: "Use a PNG with a transparent background." });
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] text-ink-soft">Position</span>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Watermark position">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={wm.position === p.id}
                  aria-label={p.label}
                  title={p.label}
                  onClick={() => set({ position: p.id })}
                  className={cn(
                    "relative aspect-[4/3] rounded-md border bg-tile outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                    wm.position === p.id ? "border-brand bg-brand-wash" : "border-rule hover:border-ink/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute h-1 w-3 rounded-full",
                      wm.position === p.id ? "bg-brand" : "bg-ink-soft/60",
                      p.id.startsWith("t") ? "top-1.5" : "bottom-1.5",
                      p.id.endsWith("l") ? "left-1.5" : p.id.endsWith("r") ? "right-1.5" : "left-1/2 -translate-x-1/2",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] text-ink-soft">Colour</span>
            <Segmented
              label="Watermark colour"
              value={wm.tone}
              onChange={(tone) => set({ tone })}
              options={[
                { id: "auto", label: "Auto", hint: "White or black, whichever shows up" },
                { id: "light", label: "White" },
                { id: "dark", label: "Black" },
              ]}
            />
          </div>
          <RangeField label="Size" value={wm.size} min={50} max={200} defaultValue={100} format={(v) => `${v}%`} onChange={(size) => set({ size })} />
          <RangeField label="Opacity" value={wm.opacity} min={20} max={100} defaultValue={92} format={(v) => `${v}%`} onChange={(opacity) => set({ opacity })} />
        </div>
      )}
    </PanelSection>
  );
}
