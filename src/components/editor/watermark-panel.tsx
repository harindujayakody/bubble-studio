"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PanelSection, RangeField } from "./controls";
import { drawStrokes } from "@/lib/editor/draw";
import { useBrand } from "@/lib/editor/brand";
import {
  logoFromFile,
  SIGNATURE_FONTS,
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
  { id: "signature", label: "Signature", hint: "Handwritten, typed or drawn" },
];

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "tl", label: "Top left" },
  { id: "tr", label: "Top right" },
  { id: "bl", label: "Bottom left" },
  { id: "bc", label: "Bottom centre" },
  { id: "br", label: "Bottom right" },
];

export function Segmented<T extends string>({
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
  const t = useT();
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
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

const PAD_W = 600;
const PAD_H = 200;
const LINE = 7;

/** Draw strokes (pad px) into a w × h canvas whose top-left is (ox, oy) in pad space. */
function paint(ctx: CanvasRenderingContext2D, strokes: number[][], ox: number, oy: number, w: number, h: number) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  drawStrokes(
    ctx,
    strokes.map((p) => ({ pts: p.map((v, i) => (i % 2 ? (v - oy) / h : (v - ox) / w)), color: "#111", brush: "pen" as const, width: LINE / w })),
    w,
    h,
  );
  ctx.restore();
}

/** A pad to sign with the mouse, finger or pen. Saves a trimmed, transparent PNG after each stroke. */
function SignaturePad({ value, onChange }: { value: string | null; onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<number[][]>([]);
  const drawing = useRef(false);

  const redraw = () => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    paint(ctx, strokes.current, 0, 0, PAD_W, PAD_H);
  };

  // Show the saved signature until a new one is drawn.
  useEffect(() => {
    if (!value || strokes.current.length) return;
    const img = new Image();
    img.onload = () => {
      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;
      const k = Math.min(PAD_W / img.width, PAD_H / img.height, 1);
      ctx.drawImage(img, (PAD_W - img.width * k) / 2, (PAD_H - img.height * k) / 2, img.width * k, img.height * k);
    };
    img.src = value;
  }, [value]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * PAD_W, ((e.clientY - r.top) / r.height) * PAD_H];
  };

  const save = () => {
    const all = strokes.current.flat();
    if (!all.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < all.length; i += 2) {
      minX = Math.min(minX, all[i]);
      maxX = Math.max(maxX, all[i]);
      minY = Math.min(minY, all[i + 1]);
      maxY = Math.max(maxY, all[i + 1]);
    }
    const c = document.createElement("canvas");
    c.width = Math.ceil(maxX - minX + LINE * 2);
    c.height = Math.ceil(maxY - minY + LINE * 2);
    paint(c.getContext("2d")!, strokes.current, minX - LINE, minY - LINE, c.width, c.height);
    onChange(c.toDataURL("image/png"));
  };

  return (
    <div className="grid gap-2">
      <canvas
        ref={ref}
        width={PAD_W}
        height={PAD_H}
        aria-label="Signature pad: sign with the mouse, finger or pen"
        className="aspect-[3/1] w-full touch-none rounded-lg bg-white ring-1 ring-rule"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push(point(e));
          redraw();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          strokes.current[strokes.current.length - 1].push(...point(e));
          redraw();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          save();
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-soft">Sign above. It takes the watermark colour.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            strokes.current = [];
            redraw();
            onChange(null);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

/**
 * Watermark settings. They are saved in this browser and apply to every export until turned
 * off, so they live with the photo/video tool rather than in one design.
 */
export function WatermarkSection() {
  const wm = useWatermark();
  const brand = useBrand();
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

          {wm.style === "signature" && (
            <div className="grid gap-2">
              <Segmented
                label="Signature type"
                value={wm.signatureMode}
                onChange={(signatureMode) => set({ signatureMode })}
                options={[
                  { id: "type", label: "Type" },
                  { id: "draw", label: "Draw" },
                ]}
              />
              {wm.signatureMode === "type" ? (
                <>
                  <Input value={wm.signatureText} maxLength={32} placeholder="Your name" aria-label="Signature name" onChange={(e) => set({ signatureText: e.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Signature font">
                    {SIGNATURE_FONTS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="radio"
                        aria-checked={wm.signatureFont === f}
                        aria-label={f}
                        onClick={() => {
                          set({ signatureFont: f });
                          document.fonts.load(`400 48px "${f}"`).catch(() => {});
                        }}
                        style={{ fontFamily: `"${f}", cursive` }}
                        className={cn(
                          "h-10 truncate rounded-md border bg-tile px-2 text-[18px] outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                          wm.signatureFont === f ? "border-brand bg-brand-wash text-ink" : "border-rule text-ink-soft hover:border-ink/30",
                        )}
                      >
                        {wm.signatureText.trim() || "Signature"}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <SignaturePad value={wm.signatureImage} onChange={(signatureImage) => set({ signatureImage })} />
              )}
            </div>
          )}

          {wm.style !== "signature" && (
            <div className="grid gap-2">
              <label htmlFor="wm-line1" className="text-[13px] text-ink-soft">
                Text
              </label>
              <Input id="wm-line1" value={wm.line1} maxLength={40} placeholder="Shot on Bubble Studio" onChange={(e) => set({ line1: e.target.value })} />
              {wm.style !== "minimal" && (
                <Input value={wm.line2} maxLength={48} placeholder="Second line, e.g. your name or shop" aria-label="Second line" onChange={(e) => set({ line2: e.target.value })} />
              )}
            </div>
          )}

          {wm.style !== "signature" && (
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
                  {brand.logos[0] && brand.logos[0] !== wm.logo && (
                    <Button variant="outline" size="sm" onClick={() => set({ logo: brand.logos[0], useLogo: true })}>
                      Use brand logo
                    </Button>
                  )}
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
          )}

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
