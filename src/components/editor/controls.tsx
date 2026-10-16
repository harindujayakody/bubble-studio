"use client";

import { useId, type ReactNode } from "react";
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
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
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
  "#111111",
  "#7d2ae8",
  "#00c4cc",
  "#ffe600",
  "#ff5a1f",
  "#16a34a",
  "#ec4899",
  "#f4efe6",
  "#1e3a5f",
];

export function ColorField({
  label,
  value,
  onChange,
  swatches = SWATCHES,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches?: string[];
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] text-ink-soft">
          {label}
        </label>
        <span className="font-mono text-xs text-ink-soft uppercase tabular">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Use colour ${c}`}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onChange(c)}
            className={cn(
              "size-6 rounded-[3px] ring-1 ring-ink/15 transition-shadow ring-inset outline-none focus-visible:ring-2 focus-visible:ring-aqua",
              value.toLowerCase() === c && "ring-2 ring-aqua ring-offset-1 ring-offset-sheet",
            )}
            style={{ background: c }}
          />
        ))}
        <label
          className="relative grid size-6 cursor-pointer place-items-center overflow-hidden rounded-[3px] ring-1 ring-ink/15 ring-inset focus-within:ring-2 focus-within:ring-aqua"
          style={{
            background:
              "conic-gradient(from 90deg, #00c4cc, #7d2ae8, #ffe600, #00c4cc)",
          }}
          title="Custom colour"
        >
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label}: custom colour`}
          />
        </label>
      </div>
    </div>
  );
}
