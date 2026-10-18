"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { SOLID_PALETTES } from "@/lib/editor/palettes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

/** Small icon button used for layer actions (forward, back, duplicate, delete). */
export function IconAction({
  label,
  onClick,
  children,
  disabled,
  destructive,
  size = "icon-sm",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  size?: "icon-sm" | "icon-xs";
}) {
  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
    >
      {children}
    </Button>
  );
}

export function PanelSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-rule px-4 pt-4 pb-5 last:border-b-0", className)}>
      <div className="mb-3 flex min-h-6 items-center justify-between gap-2">
        <h3 className="font-heading text-[14px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  centered = false,
  defaultValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  /** Show a centre tick for bipolar controls. */
  centered?: boolean;
  /** Double-clicking the label resets to this. */
  defaultValue?: number;
}) {
  const id = useId();
  const shown = format ? format(value) : value > 0 && centered ? `+${value}` : `${value}`;
  const changed = defaultValue !== undefined && value !== defaultValue;
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="cursor-default text-[13px] text-ink-soft select-none"
          onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
          title={defaultValue !== undefined ? "Double-click to reset" : undefined}
        >
          {label}
        </label>
        <span
          className={cn(
            "font-mono text-xs tabular",
            changed ? "text-aqua-ink" : "text-ink-soft",
          )}
        >
          {shown}
        </span>
      </div>
      <div className="relative">
        {centered && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-ink-soft/40"
          />
        )}
        <Slider
          id={id}
          aria-label={label}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
        />
      </div>
    </div>
  );
}

const SWATCHES = [
  "#ffffff",
  "#e5e7eb",
  "#6b7280",
  "#111111",
  "#7d2ae8",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#ff5a1f",
  "#ffd60a",
  "#16a34a",
  "#00c4cc",
  "#2563eb",
  "#1e3a5f",
  "#f4efe6",
];

/** Light swatches get a dark check mark, dark ones a white one. */
function isLight(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

function Swatch({
  color,
  active,
  label,
  onClick,
  shape = "circle",
}: {
  color: string;
  active: boolean;
  label: string;
  onClick: () => void;
  shape?: "circle" | "bar";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "relative grid place-items-center ring-1 ring-ink/15 ring-inset outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-aqua",
        shape === "circle" ? "aspect-square rounded-full" : "h-7 flex-1 rounded-md hover:scale-y-110",
        active && "ring-2 ring-aqua ring-offset-2 ring-offset-sheet",
      )}
      style={{ background: color }}
    >
      {active && <Check className={cn("size-3.5", isLight(color) ? "text-[#111]" : "text-white")} strokeWidth={3} />}
    </button>
  );
}

/**
 * Colour picker: a grid of default colours with a custom-colour tile, then named palettes
 * (open from the start where colour is the main choice, e.g. the background).
 */
export function ColorField({
  label,
  value,
  onChange,
  swatches = SWATCHES,
  palettes = "closed",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches?: string[];
  palettes?: "open" | "closed";
}) {
  const id = useId();
  const [showPalettes, setShowPalettes] = useState(palettes === "open");
  const v = value.toLowerCase();
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-soft">{label}</span>
        <label
          htmlFor={id}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-rule bg-sheet pr-2 pl-1 font-mono text-xs text-ink uppercase tabular hover:border-ink/30"
          title="Pick any colour"
        >
          <span className="size-5 rounded-[5px] ring-1 ring-ink/15 ring-inset" style={{ background: value }} />
          {value}
        </label>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {swatches.map((c) => (
          <Swatch key={c} color={c} active={v === c} label={`Use colour ${c}`} onClick={() => onChange(c)} />
        ))}
        <label
          className="relative grid aspect-square cursor-pointer place-items-center rounded-full outline-none focus-within:ring-2 focus-within:ring-aqua"
          style={{ background: "conic-gradient(from 0deg, #ff3d6e, #ffd60a, #16a34a, #00c4cc, #2563eb, #7d2ae8, #ff3d6e)" }}
          title="Custom colour"
        >
          <span className="grid size-[62%] place-items-center rounded-full bg-sheet">
            <Plus className="size-3.5 text-ink" strokeWidth={2.5} />
          </span>
          <input
            id={id}
            type="color"
            value={value.length === 7 ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label}: custom colour`}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => setShowPalettes((x) => !x)}
        aria-expanded={showPalettes}
        className="flex h-7 items-center justify-between rounded-md text-xs font-medium text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="flex -space-x-1" aria-hidden>
            {["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff"].map((c) => (
              <span key={c} className="size-3 rounded-full ring-2 ring-sheet" style={{ background: c }} />
            ))}
          </span>
          Colour palettes
        </span>
        <ChevronDown className={cn("size-3.5 transition-transform", showPalettes && "rotate-180")} />
      </button>
      {showPalettes && (
        <div className="grid gap-3">
          {SOLID_PALETTES.map((p) => (
            <div key={p.name} className="grid gap-1.5">
              <span className="text-[11px] font-medium text-ink-soft">{p.name}</span>
              <div className="flex gap-1">
                {p.colors.map((c) => (
                  <Swatch
                    key={c.hex + c.name}
                    shape="bar"
                    color={c.hex.toLowerCase()}
                    active={v === c.hex.toLowerCase()}
                    label={`${p.name}: ${c.name} ${c.hex}`}
                    onClick={() => onChange(c.hex.toLowerCase())}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
