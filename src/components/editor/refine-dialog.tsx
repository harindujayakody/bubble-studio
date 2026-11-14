"use client";

import { useCallback, useRef, useState } from "react";
import { Eraser, Paintbrush, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RangeField } from "./controls";
import { Segmented } from "./watermark-panel";

type Mode = "erase" | "restore";

/**
 * Refine a background cut-out by hand: Erase removes leftover background, Restore paints the
 * original back where the model cut too much. Strokes go straight onto the image's own pixels,
 * so it works the same for the photo and for image stickers.
 */
export function RefineDialog({
  cut,
  original,
  onCancel,
  onDone,
}: {
  cut: HTMLImageElement;
  original: HTMLImageElement;
  onCancel: () => void;
  onDone: (png: Blob) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<[number, number] | null>(null);
  const [mode, setMode] = useState<Mode>("erase");
  const [brush, setBrush] = useState(30);
  const [saving, setSaving] = useState(false);
  const w = cut.naturalWidth;
  const h = cut.naturalHeight;

  const reset = () => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(cut, 0, 0);
  };
  // The dialog mounts its contents after opening, so draw the cut-out when the canvas attaches.
  const attach = useCallback(
    (el: HTMLCanvasElement | null) => {
      ref.current = el;
      el?.getContext("2d")?.drawImage(cut, 0, 0);
    },
    [cut],
  );

  /** One brush segment, in image pixels; `r` is the brush radius. */
  const paint = (a: [number, number], b: [number, number], r: number) => {
    const ctx = ref.current!.getContext("2d")!;
    if (mode === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineWidth = r * 2;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.restore();
      return;
    }
    // Restore: the original's pixels, kept only under the stroke, drawn over the cut-out.
    const x = Math.floor(Math.min(a[0], b[0]) - r);
    const y = Math.floor(Math.min(a[1], b[1]) - r);
    const t = document.createElement("canvas");
    t.width = Math.ceil(Math.abs(a[0] - b[0]) + r * 2) + 2;
    t.height = Math.ceil(Math.abs(a[1] - b[1]) + r * 2) + 2;
    const tc = t.getContext("2d")!;
    tc.drawImage(original, -x, -y, w, h);
    tc.globalCompositeOperation = "destination-in";
    tc.lineCap = "round";
    tc.lineWidth = r * 2;
    tc.beginPath();
    tc.moveTo(a[0] - x, a[1] - y);
    tc.lineTo(b[0] - x, b[1] - y);
    tc.stroke();
    ctx.drawImage(t, x, y);
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { p: [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * h] as [number, number], scale: w / r.width };
  };

  const done = async () => {
    setSaving(true);
    const blob = await new Promise<Blob | null>((resolve) => ref.current!.toBlob(resolve, "image/png"));
    setSaving(false);
    if (blob) onDone(blob);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refine the cut-out</DialogTitle>
          <DialogDescription>
            Paint over leftover background to erase it, or over missing edges to bring them back.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="checker grid max-h-[55vh] place-items-center overflow-hidden rounded-lg ring-1 ring-rule">
            <canvas
              ref={attach}
              width={w}
              height={h}
              aria-label={mode === "erase" ? "Cut-out: paint to erase" : "Cut-out: paint to restore"}
              className="block max-h-[55vh] max-w-full touch-none"
              style={{ cursor: "crosshair", aspectRatio: `${w} / ${h}` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const { p, scale } = point(e);
                last.current = p;
                paint(p, p, (brush / 2) * scale);
              }}
              onPointerMove={(e) => {
                if (!last.current) return;
                const { p, scale } = point(e);
                paint(last.current, p, (brush / 2) * scale);
                last.current = p;
              }}
              onPointerUp={() => (last.current = null)}
              onPointerCancel={() => (last.current = null)}
            />
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Segmented
              label="Brush"
              value={mode}
              onChange={setMode}
              options={[
                { id: "erase", label: "Erase" },
                { id: "restore", label: "Restore" },
              ]}
            />
            <RangeField label="Brush size" value={brush} min={6} max={120} defaultValue={30} format={(v) => `${v} px`} onChange={setBrush} />
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw /> Start over
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            {mode === "erase" ? <Eraser className="size-3.5" /> : <Paintbrush className="size-3.5" />}
            {mode === "erase" ? "Erase: removes what you paint over." : "Restore: brings back the original photo where you paint."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => void done()} disabled={saving}>
            {saving ? "Saving…" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
