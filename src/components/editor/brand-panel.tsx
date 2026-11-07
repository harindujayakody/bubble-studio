"use client";

import { useRef } from "react";
import { Download, ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelSection } from "./controls";
import { POSTER_FONTS, fontStack } from "@/lib/editor/fonts";
import {
  MAX_COLORS,
  MAX_LOGOS,
  brandFile,
  brandLogoFromFile,
  readBrandFile,
  setBrand,
  useBrand,
  type BrandKit,
} from "@/lib/editor/brand";
import { saveExport } from "@/lib/editor/save";

function FontPick({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-[13px] text-ink-soft">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 w-full min-w-0 rounded-lg border border-input bg-sheet px-2 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-aqua"
        style={value ? { fontFamily: fontStack(value) } : undefined}
      >
        <option value="">App default</option>
        {POSTER_FONTS.map((f) => (
          <option key={f.family} value={f.family} style={{ fontFamily: fontStack(f.family) }}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Settings → Brand kit: logos, colours and fonts used across the app. */
export function BrandKitSection() {
  const brand = useBrand();
  const logoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const save = (p: Partial<BrandKit>) => {
    if (!setBrand(p)) toast.error("The brand kit is full", { description: "Remove a logo or use a smaller image." });
  };

  return (
    <PanelSection title="Brand kit">
      <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
        Your logo, colours and fonts, offered first in every colour picker, the font list, new text and Elements.
      </p>

      <div className="grid gap-5">
        <Input value={brand.name} placeholder="Business name" aria-label="Business name" onChange={(e) => save({ name: e.target.value })} />

        <div className="grid gap-2">
          <span className="text-[13px] font-medium text-ink">Logos</span>
          <div className="flex flex-wrap gap-2">
            {brand.logos.map((l, i) => (
              <div key={i} className="group checker relative grid size-16 place-items-center overflow-hidden rounded-lg ring-1 ring-rule">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l} alt={`Logo ${i + 1}`} className="max-h-full max-w-full object-contain p-1" />
                <button
                  type="button"
                  aria-label={`Remove logo ${i + 1}`}
                  onClick={() => save({ logos: brand.logos.filter((_, j) => j !== i) })}
                  className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-sheet/90 text-ink-soft opacity-0 shadow-float group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {brand.logos.length < MAX_LOGOS && (
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="grid size-16 place-items-center rounded-lg border-2 border-dashed border-rule text-ink-soft outline-none hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-aqua"
                aria-label="Add a logo"
              >
                <ImagePlus className="size-5" />
              </button>
            )}
          </div>
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
                save({ logos: [...brand.logos, await brandLogoFromFile(f)] });
              } catch {
                toast.error("That logo couldn't be opened", { description: "Use a PNG, ideally with a transparent background." });
              }
            }}
          />
        </div>

        <div className="grid gap-2">
          <span className="text-[13px] font-medium text-ink">Colours</span>
          <div className="flex flex-wrap items-center gap-2">
            {brand.colors.map((c, i) => (
              <span key={i} className="group relative">
                <label className="block size-9 cursor-pointer overflow-hidden rounded-full ring-1 ring-ink/15 ring-inset" style={{ background: c }} title={c}>
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => save({ colors: brand.colors.map((x, j) => (j === i ? e.target.value : x)) })}
                    className="size-full cursor-pointer opacity-0"
                    aria-label={`Brand colour ${i + 1}`}
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove brand colour ${i + 1}`}
                  onClick={() => save({ colors: brand.colors.filter((_, j) => j !== i) })}
                  className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-sheet text-ink-soft opacity-0 shadow-float group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
            {brand.colors.length < MAX_COLORS && (
              <button
                type="button"
                onClick={() => save({ colors: [...brand.colors, "#7d2ae8"] })}
                className="grid size-9 place-items-center rounded-full border-2 border-dashed border-rule text-ink-soft outline-none hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-aqua"
                aria-label="Add a brand colour"
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-ink-soft">Click a colour to change it.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FontPick label="Heading font" value={brand.headingFont} onChange={(headingFont) => save({ headingFont })} />
          <FontPick label="Body font" value={brand.bodyFont} onChange={(bodyFont) => save({ bodyFont })} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void saveExport(brandFile(brand), `${brand.name.trim() || "brand"}-kit.bubblebrand`, "photos")}>
            <Download /> Export kit
          </Button>
          <Button variant="outline" size="sm" onClick={() => importInput.current?.click()}>
            <Upload /> Import kit
          </Button>
          {(brand.logos.length > 0 || brand.colors.length > 0 || brand.headingFont || brand.bodyFont) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => save({ logos: [], colors: [], headingFont: null, bodyFont: null, name: "" })}
            >
              <Trash2 /> Clear
            </Button>
          )}
          <input
            ref={importInput}
            type="file"
            accept=".bubblebrand,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                save(await readBrandFile(f));
                toast.success("Brand kit imported");
              } catch (err) {
                toast.error("Couldn't import the brand kit", { description: err instanceof Error ? err.message : undefined });
              }
            }}
          />
        </div>
      </div>
    </PanelSection>
  );
}
