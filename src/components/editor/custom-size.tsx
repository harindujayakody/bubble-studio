"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_EXPORT_SIDE } from "@/lib/editor/types";

/** Handy sizes people ask for, beyond the standard post shapes. */
const COMMON: { label: string; w: number; h: number }[] = [
  { label: "Facebook cover", w: 851, h: 315 },
  { label: "Event cover", w: 1920, h: 1005 },
  { label: "Profile picture", w: 720, h: 720 },
  { label: "YouTube thumbnail", w: 1280, h: 720 },
  { label: "A4 flyer", w: 2480, h: 3508 },
  { label: "WhatsApp status", w: 1080, h: 1920 },
];

const MIN = 100;
const clampSide = (n: number) => Math.round(Math.min(MAX_EXPORT_SIDE, Math.max(MIN, n)));

/** Width × height in pixels, with common sizes one click away. Used to start and to resize. */
export function CustomSizeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: { w: number; h: number } | null;
  submitLabel: string;
  onSubmit: (dims: { w: number; h: number }) => void;
}) {
  const [w, setW] = useState(String(initial?.w ?? 1200));
  const [h, setH] = useState(String(initial?.h ?? 628));
  const wn = Number(w);
  const hn = Number(h);
  const valid = wn >= MIN && hn >= MIN && wn <= MAX_EXPORT_SIDE && hn <= MAX_EXPORT_SIDE;

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ w: clampSide(wn), h: clampSide(hn) });
      }}
    >
      <div className="flex items-end gap-2">
        <label className="grid flex-1 gap-1 text-xs text-ink-soft">
          Width
          <Input inputMode="numeric" value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ""))} aria-label="Width in pixels" />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Swap width and height"
          title="Swap width and height"
          onClick={() => {
            setW(h);
            setH(w);
          }}
        >
          <ArrowLeftRight />
        </Button>
        <label className="grid flex-1 gap-1 text-xs text-ink-soft">
          Height
          <Input inputMode="numeric" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ""))} aria-label="Height in pixels" />
        </label>
        <span className="pb-2.5 text-xs text-ink-soft">px</span>
      </div>
      {!valid && (w || h) && (
        <p className="text-xs text-destructive">Use {MIN} to {MAX_EXPORT_SIDE} pixels on each side.</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COMMON.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              setW(String(c.w));
              setH(String(c.h));
            }}
            className="h-7 rounded-full bg-tile px-2.5 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-aqua"
            title={`${c.w} × ${c.h}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Button type="submit" disabled={!valid}>
        {submitLabel}
      </Button>
    </form>
  );
}
