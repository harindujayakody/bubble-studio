"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { clampCrop, defaultCrop, drawPhotoLook, postDims, type Source } from "@/lib/editor/render";
import type { Crop, PostState } from "@/lib/editor/types";

/** Crop mode: the whole photo with a square yellow frame the user drags and resizes. */
export function CropView({
  source,
  state,
  sideX,
  sideY,
  onCropChange,
}: {
  source: Source;
  state: PostState;
  sideX: number;
  sideY: number;
  onCropChange: (crop: Crop, key: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sw = source.width;
  const sh = source.height;
  // Fit the whole photo inside the sheet area.
  const fit = Math.min(sideX / sw, sideY / sh);
  const ar = postDims(state).aspect;
  const dw = Math.round(sw * fit);
  const dh = Math.round(sh * fit);
  const crop = state.crop ?? defaultCrop(sw, sh, ar);
  const cropH = crop.size / ar;
  const drag = useRef<{ mode: "move" | "resize"; corner: number; px: number; py: number; crop: Crop } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(dw * dpr);
    canvas.height = Math.round(dh * dpr);
    const ctx = canvas.getContext("2d")!;
    drawPhotoLook(ctx, source, state, 0, 0, sw, sh, canvas.width, canvas.height);
  }, [source, state, dw, dh, sw, sh]);

  const begin = (e: ReactPointerEvent, mode: "move" | "resize", corner: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, corner, px: e.clientX, py: e.clientY, crop };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.px) / fit;
    const dy = (e.clientY - d.py) / fit;
    const c = d.crop;
    if (d.mode === "move") {
      onCropChange(clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, sw, sh, ar), "crop:move");
      return;
    }
    // Corners: 0 TL, 1 TR, 2 BL, 3 BR. Resize from the opposite corner, keeping the post's ratio.
    const right = d.corner === 1 || d.corner === 3;
    const bottom = d.corner === 2 || d.corner === 3;
    const ch = c.size / ar;
    const delta = Math.max(right ? dx : -dx, (bottom ? dy : -dy) * ar);
    const anchorX = right ? c.x : c.x + c.size;
    const anchorY = bottom ? c.y : c.y + ch;
    const maxSize = Math.min(right ? sw - anchorX : anchorX, (bottom ? sh - anchorY : anchorY) * ar);
    const size = Math.min(maxSize, Math.max(Math.min(sw, sh * ar) * 0.1, c.size + delta));
    onCropChange(
      { size, x: right ? anchorX : anchorX - size, y: bottom ? anchorY : anchorY - size / ar },
      "crop:resize",
    );
  };
  const end = () => (drag.current = null);

  const frame = {
    left: crop.x * fit,
    top: crop.y * fit,
    w: crop.size * fit,
    h: cropH * fit,
  };

  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative" style={{ width: dw, height: dh }}>
        <div className="absolute inset-0 overflow-hidden">
          <canvas ref={canvasRef} className="block size-full" aria-label="Full photo" role="img" />
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: frame.left,
              top: frame.top,
              width: frame.w,
              height: frame.h,
              boxShadow: "0 0 0 9999px oklch(0.2 0.012 260 / 0.62)",
            }}
          />
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label="Crop frame. Drag or use the arrow keys to move it."
          className="absolute cursor-move touch-none outline-none focus-visible:ring-2 focus-visible:ring-aqua"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.w,
            height: frame.h,
          }}
          onPointerDown={(e) => begin(e, "move", -1)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={(e) => {
            const step = (e.shiftKey ? 40 : 8) / fit;
            const map: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            };
            const v = map[e.key];
            if (!v) return;
            e.preventDefault();
            e.stopPropagation();
            onCropChange(clampCrop({ ...crop, x: crop.x + v[0], y: crop.y + v[1] }, sw, sh, ar), "crop:key");
          }}
        >
          {/* Rule-of-thirds guides */}
          <span aria-hidden className="pointer-events-none absolute inset-0 border-2 border-yellow shadow-[0_0_0_1px_oklch(0.2_0.012_260/0.5)]" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/40" />
          {[0, 1, 2, 3].map((corner) => (
            <span
              key={corner}
              aria-hidden
              onPointerDown={(e) => begin(e, "resize", corner)}
              onPointerMove={move}
              onPointerUp={end}
              className={cn(
                "absolute size-7 touch-none drop-shadow-[0_1px_1px_oklch(0.2_0.012_260/0.6)]",
                corner === 0 && "-top-1.5 -left-1.5 cursor-nwse-resize border-t-4 border-l-4",
                corner === 1 && "-top-1.5 -right-1.5 cursor-nesw-resize border-t-4 border-r-4",
                corner === 2 && "-bottom-1.5 -left-1.5 cursor-nesw-resize border-b-4 border-l-4",
                corner === 3 && "-right-1.5 -bottom-1.5 cursor-nwse-resize border-r-4 border-b-4",
                "border-yellow",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
