"use client";

import { Eraser, Highlighter, PenLine, Plus, Brush as MarkerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ColorField, PanelSection, RangeField } from "./controls";
import type { Brush } from "@/lib/editor/draw";

type BrushState = { type: Brush | "eraser"; color: string; width: number };

const BRUSHES: { id: BrushState["type"]; label: string; icon: typeof PenLine }[] = [
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "marker", label: "Marker", icon: MarkerIcon },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

/** Draw tool settings. Drawing itself happens on the canvas. */
export function DrawPanel({
  brush,
  onBrush,
  editing,
  onNewDrawing,
}: {
  brush: BrushState;
  onBrush: (b: BrushState) => void;
  /** A drawing is selected, so new strokes are added to it. */
  editing: boolean;
  onNewDrawing: () => void;
}) {
  return (
    <>
      <PanelSection title="Draw">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Draw on the post with your mouse, finger or pen. Each drawing is a layer you can move and resize from Elements.
        </p>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Brush">
          {BRUSHES.map(({ id, label, icon: Icon }) => {
            const on = brush.type === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onBrush({ ...brush, type: id, width: id === "highlighter" && brush.width < 20 ? 28 : brush.width })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                  on ? "border-brand bg-brand-wash text-brand" : "border-rule text-ink hover:bg-tile",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title={brush.type === "eraser" ? "Eraser" : "Brush"}>
        <div className="grid gap-5">
          <RangeField
            label={brush.type === "eraser" ? "Eraser size" : "Thickness"}
            value={brush.width}
            min={2}
            max={80}
            format={(v) => `${v} px`}
            onChange={(width) => onBrush({ ...brush, width })}
          />
          {brush.type !== "eraser" && (
            <ColorField label="Colour" value={brush.color} onChange={(color) => onBrush({ ...brush, color })} />
          )}
          {brush.type === "eraser" && (
            <p className="text-xs text-pretty text-ink-soft">Rub over a line in the selected drawing to remove it.</p>
          )}
        </div>
      </PanelSection>

      <PanelSection title="Layer">
        <p className="-mt-1 mb-3 text-xs text-pretty text-ink-soft">
          {editing ? "New lines are added to the selected drawing." : "Your next line starts a new drawing."}
        </p>
        <Button variant="outline" onClick={onNewDrawing} disabled={!editing}>
          <Plus /> Start a new drawing
        </Button>
      </PanelSection>
    </>
  );
}
