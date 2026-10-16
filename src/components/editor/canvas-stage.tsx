"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Film, ImagePlus, Move, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clampCrop, defaultCrop, postDims, renderPost, type Assets, type Source, type TextBox } from "@/lib/editor/render";
import { fontStack, nearestWeight } from "@/lib/editor/fonts";
import {
  type Crop,
  type PostState,
  type Region,
  type Sticker,
  type TextLayer,
  type ToolId,
  POST_SIZES,
} from "@/lib/editor/types";
import { CropView } from "./crop-view";

export type RegionDefaults = Pick<Region, "kind" | "shape" | "strength">;

type Props = {
  source: Source | null;
  assets: Assets;
  state: PostState;
  tool: ToolId;
  selectedId: string | null;
  fontsVersion: number;
  showEmpty: boolean;
  /** Fires on every new video frame, so the sheet redraws while a reel plays. */
  clock?: EventTarget;
  regionDefaults: RegionDefaults;
  onSelect: (id: string | null) => void;
  onTextChange: (id: string, patch: Partial<TextLayer>, key: string) => void;
  onStickerChange: (id: string, patch: Partial<Sticker>, key: string) => void;
  onRegions: (fn: (regions: Region[]) => Region[], key?: string) => void;
  onCropChange: (crop: Crop, key: string) => void;
  onPickPhoto: () => void;
  onStartBlank: () => void;
  onDropFile: (file: File) => void;
};

/** Space reserved around the sheet for crop marks and registration targets. */
const GUTTER = 36;
const SNAP = 0.012;

export function CanvasStage(props: Props) {
  const { source, assets, state, tool, selectedId, fontsVersion, showEmpty, clock } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Room available for the sheet, before the gutter. */
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** The tool that was active when the photo went into reposition mode. */
  const [panTool, setPanTool] = useState<ToolId | null>(null);

  // Fit the sheet into the available space, leaving a gutter for the marks.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAvail({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit the sheet to the post's ratio. `side` is its width on screen, `sideY` its height.
  const post = postDims(state);
  const side =
    avail.w > 0 ? Math.max(120, Math.floor(Math.min(avail.w - GUTTER * 2, (avail.h - GUTTER * 2) * post.aspect))) : 0;
  const sideY = Math.round(side / post.aspect);

  const cropping = tool === "crop" && !!source;
  const blurring = tool === "blur";
  const panning = panTool === tool && !!source && !cropping && !blurring;
  const mounted = side > 0;
  // Leave edit mode when the layer goes away (undo, delete) or another one is selected.
  const editing =
    editingId && editingId === selectedId && state.texts.some((t) => t.id === editingId) ? editingId : null;

  useEffect(() => {
    if (cropping) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const next = renderPost(ctx, { source, assets, state, width: post.w, hideTextId: editing });
      // Video frames redraw ~30 times a second; only touch React state when a box actually moved.
      setBoxes((prev) => (sameBoxes(prev, next) ? prev : next));
    };
    const raf = requestAnimationFrame(draw);
    clock?.addEventListener("frame", draw);
    return () => {
      cancelAnimationFrame(raf);
      clock?.removeEventListener("frame", draw);
    };
  }, [source, assets, state, cropping, fontsVersion, mounted, editing, post.w, clock]);

  useEffect(() => {
    if (!panning) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanTool(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panning]);

  const zoom = side ? Math.round((side / post.w) * 100) : 0;
  const showHandles = !blurring && !panning;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) props.onDropFile(file);
      }}
    >
      <div
        ref={wrapRef}
        className="relative grid min-h-0 flex-1 place-items-center select-none"
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          props.onSelect(null);
          setPanTool(null);
        }}
      >
        {side > 0 && (
          <div className="relative" style={{ width: side, height: sideY }}>
            <ProofMarks active={cropping || panning} w={side} h={sideY} />

            {cropping ? (
              <CropView
                source={source!}
                state={state}
                sideX={Math.max(side, avail.w - GUTTER * 2)}
                sideY={Math.max(sideY, avail.h - GUTTER * 2)}
                onCropChange={props.onCropChange}
              />
            ) : (
              <div
                className="relative size-full bg-sheet shadow-[0_1px_2px_oklch(0.2_0.02_260/0.12),0_12px_32px_-12px_oklch(0.2_0.02_260/0.28)]"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget || e.target === canvasRef.current) props.onSelect(null);
                }}
                onDoubleClick={(e) => {
                  if (source && e.target === canvasRef.current && !blurring) {
                    props.onSelect(null);
                    setPanTool(tool);
                  }
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={post.w}
                  height={post.h}
                  className="block size-full"
                  aria-label="Post preview"
                  role="img"
                />

                {guides.v && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-magenta" />
                )}
                {guides.h && (
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-magenta" />
                )}

                {showHandles &&
                  boxes.map((box) => {
                    if (box.kind === "sticker") {
                      const s = state.stickers.find((x) => x.id === box.id);
                      if (!s) return null;
                      return (
                        <LayerHandle
                          key={box.id}
                          box={box}
                          side={side}
                          sideY={sideY}
                          label={`${s.kind === "emoji" ? `Emoji ${s.value}` : s.kind === "icon" ? "Icon" : "Sticker"}`}
                          selected={selectedId === box.id}
                          resizeValue={s.size}
                          min={24}
                          max={1400}
                          onSelect={() => props.onSelect(box.id)}
                          onMove={(x, y) => props.onStickerChange(s.id, { x, y }, `move:${s.id}`)}
                          onResize={(size) => props.onStickerChange(s.id, { size }, `size:${s.id}`)}
                          onGuides={setGuides}
                        />
                      );
                    }
                    const layer = state.texts.find((t) => t.id === box.id);
                    if (!layer) return null;
                    if (layer.id === editing) {
                      return (
                        <InlineTextEditor
                          key={box.id}
                          layer={layer}
                          side={side}
                          postW={post.w}
                          onChange={(text) => props.onTextChange(layer.id, { text }, `text:${layer.id}`)}
                          onDone={() => setEditingId(null)}
                        />
                      );
                    }
                    return (
                      <LayerHandle
                        key={box.id}
                        box={box}
                        side={side}
                        sideY={sideY}
                        label={`Text: ${layer.text || "empty"}. Double-click to edit.`}
                        selected={selectedId === box.id}
                        resizeValue={layer.fontSize}
                        min={12}
                        max={400}
                        onSelect={() => props.onSelect(box.id)}
                        onEdit={() => {
                          props.onSelect(box.id);
                          setEditingId(box.id);
                        }}
                        onMove={(x, y) => props.onTextChange(layer.id, { x, y }, `move:${layer.id}`)}
                        onResize={(fontSize) => props.onTextChange(layer.id, { fontSize }, `size:${layer.id}`)}
                        onGuides={setGuides}
                      />
                    );
                  })}

                {blurring && (
                  <RegionLayer
                    regions={state.regions}
                    side={side}
                    sideY={sideY}
                    selectedId={selectedId}
                    defaults={props.regionDefaults}
                    onSelect={props.onSelect}
                    onRegions={props.onRegions}
                  />
                )}

                {panning && (
                  <PanLayer
                    source={source!}
                    crop={state.crop ?? defaultCrop(source!.width, source!.height, post.aspect)}
                    aspect={post.aspect}
                    side={side}
                    sideY={sideY}
                    onCropChange={props.onCropChange}
                    onDone={() => setPanTool(null)}
                  />
                )}

                {showEmpty && (
                  <EmptySheet
                    video={state.media === "video"}
                    onPickPhoto={props.onPickPhoto}
                    onStartBlank={props.onStartBlank}
                  />
                )}
              </div>
            )}

            {dragOver && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-cyan-wash/85 ring-2 ring-cyan ring-inset">
                <p className="text-sm font-semibold text-cyan-ink">
                  {state.media === "video" ? "Drop a video, or an image to add as a sticker" : "Drop to use this photo"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ColourBar
        zoom={zoom}
        dims={`${post.w} × ${post.h} px`}
        label={
          cropping
            ? "Crop · drag the frame"
            : panning
              ? "Move photo · drag, scroll to zoom"
              : blurring
                ? "Blur · drag over the photo"
                : source
                  ? state.media === "video"
                    ? "Reel · double-click the video to move it"
                    : `${POST_SIZES[state.size].label} · double-click photo to move it`
                  : POST_SIZES[state.size].label
        }
      />
    </div>
  );
}

/** Reposition mode: drag pans the photo inside the square, the wheel zooms around the pointer. */
function PanLayer({
  source,
  crop,
  aspect,
  side,
  sideY,
  onCropChange,
  onDone,
}: {
  source: Source;
  crop: Crop;
  aspect: number;
  side: number;
  sideY: number;
  onCropChange: (crop: Crop, key: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; crop: Crop } | null>(null);
  const latest = useRef({ crop, side, sideY, aspect, source, onCropChange });
  useEffect(() => {
    latest.current = { crop, side, sideY, aspect, source, onCropChange };
  });

  // React's wheel listener is passive; zooming needs to cancel the page scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Firefox reports lines or pages; normalise to pixels.
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const { crop: c, side: s, sideY: sy, aspect: ar, source: src, onCropChange: change } = latest.current;
      const rect = el.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / s;
      const fy = (e.clientY - rect.top) / sy;
      const maxSize = Math.min(src.width, src.height * ar);
      const size = Math.min(maxSize, Math.max(maxSize * 0.1, c.size * (1 + dy * 0.0015)));
      // Keep the photo point under the pointer fixed while zooming.
      const px = c.x + fx * c.size;
      const py = c.y + (fy * c.size) / ar;
      change(clampCrop({ size, x: px - fx * size, y: py - (fy * size) / ar }, src.width, src.height, ar), "crop:wheel");
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Move the photo. Drag to reposition, scroll to zoom, press Escape when done."
      className="absolute inset-0 cursor-grab touch-none select-none outline-2 -outline-offset-2 outline-cyan outline-dashed active:cursor-grabbing"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { px: e.clientX, py: e.clientY, crop };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const k = d.crop.size / side;
        onCropChange(
          clampCrop(
            { ...d.crop, x: d.crop.x - (e.clientX - d.px) * k, y: d.crop.y - (e.clientY - d.py) * k },
            source.width,
            source.height,
            aspect,
          ),
          "crop:pan",
        );
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={onDone}
    >
      <div className="pointer-events-auto absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/90 py-1 pr-1 pl-3 text-xs text-sheet shadow-[0_4px_12px_-4px_oklch(0.2_0.02_260/0.5)]">
        <Move className="size-3.5" />
        <span className="whitespace-nowrap">Drag to move · scroll to zoom</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDone}
          className="rounded-full bg-sheet px-2.5 py-1 font-semibold text-ink outline-none hover:bg-cyan-wash focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/** Blur tool: drag on empty space to add an area; drag an area to move it; corners resize it. */
function RegionLayer({
  regions,
  side,
  sideY,
  selectedId,
  defaults,
  onSelect,
  onRegions,
}: {
  regions: Region[];
  side: number;
  sideY: number;
  selectedId: string | null;
  defaults: RegionDefaults;
  onSelect: (id: string | null) => void;
  onRegions: (fn: (regions: Region[]) => Region[], key?: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const action = useRef<
    | { type: "draw"; id: string | null; x: number; y: number }
    | { type: "move" | "resize"; id: string; corner: number; px: number; py: number; start: Region }
    | null
  >(null);

  const point = (e: ReactPointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / side), y: clamp01((e.clientY - r.top) / sideY) };
  };
  const patch = (id: string, p: Partial<Region>, key: string) =>
    onRegions((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)), key);

  const onMove = (e: ReactPointerEvent) => {
    const a = action.current;
    if (!a) return;
    if (a.type === "draw") {
      const p = point(e);
      const rect = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
      if (!a.id) {
        if (rect.w < 0.015 && rect.h < 0.015) return;
        const id = crypto.randomUUID();
        a.id = id;
        onRegions((rs) => [...rs, { id, ...defaults, ...rect }], `region:draw:${id}`);
        onSelect(id);
      } else {
        patch(a.id, rect, `region:draw:${a.id}`);
      }
      return;
    }
    const dx = (e.clientX - a.px) / side;
    const dy = (e.clientY - a.py) / sideY;
    const s = a.start;
    if (a.type === "move") {
      patch(a.id, { x: Math.min(1 - s.w, Math.max(0, s.x + dx)), y: Math.min(1 - s.h, Math.max(0, s.y + dy)) }, `region:move:${a.id}`);
      return;
    }
    const left = a.corner === 0 || a.corner === 2;
    const top = a.corner === 0 || a.corner === 1;
    let x0 = s.x, y0 = s.y, x1 = s.x + s.w, y1 = s.y + s.h;
    if (left) x0 = clamp01(x0 + dx); else x1 = clamp01(x1 + dx);
    if (top) y0 = clamp01(y0 + dy); else y1 = clamp01(y1 + dy);
    const min = 0.02;
    if (x1 - x0 < min) { if (left) x0 = x1 - min; else x1 = x0 + min; }
    if (y1 - y0 < min) { if (top) y0 = y1 - min; else y1 = y0 + min; }
    patch(a.id, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, `region:resize:${a.id}`);
  };
  const end = () => (action.current = null);

  return (
    <div
      ref={ref}
      className="absolute inset-0 cursor-crosshair touch-none"
      onPointerDown={(e) => {
        // Without this, a stray text selection turns the drag into native drag-and-drop and cancels the pointer.
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = point(e);
        onSelect(null);
        action.current = { type: "draw", id: null, ...p };
      }}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDragStart={(e) => e.preventDefault()}
    >
      {regions.map((r) => {
        const selected = r.id === selectedId;
        return (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={`${r.kind === "blur" ? "Blurred" : "Pixelated"} area`}
            aria-pressed={selected}
            className={cn(
              "absolute cursor-move outline-none",
              r.shape === "ellipse" && "rounded-[50%]",
              selected
                ? "ring-[1.5px] ring-cyan"
                : "ring-1 ring-white/80 [box-shadow:0_0_0_2px_oklch(0.2_0.012_260/0.35)] hover:ring-cyan focus-visible:ring-cyan",
            )}
            style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.focus();
              ref.current!.setPointerCapture(e.pointerId);
              onSelect(r.id);
              action.current = { type: "move", id: r.id, corner: -1, px: e.clientX, py: e.clientY, start: r };
            }}
          >
            {selected &&
              CORNERS.map((c, i) => (
                <span
                  key={c.pos}
                  aria-hidden
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ref.current!.setPointerCapture(e.pointerId);
                    action.current = { type: "resize", id: r.id, corner: i, px: e.clientX, py: e.clientY, start: r };
                  }}
                  className={cn("absolute size-2.5 bg-sheet ring-[1.5px] ring-cyan after:absolute after:-inset-2", c.pos, c.cursor)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

const CORNERS = [
  { pos: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize" },
  { pos: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize" },
  { pos: "-left-1.5 -bottom-1.5", cursor: "cursor-nesw-resize" },
  { pos: "-right-1.5 -bottom-1.5", cursor: "cursor-nwse-resize" },
] as const;

/** Type straight onto the post. Matches the canvas text closely; the canvas takes over again on exit. */
function InlineTextEditor({
  layer,
  side,
  postW,
  onChange,
  onDone,
}: {
  layer: TextLayer;
  side: number;
  postW: number;
  onChange: (text: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fontSize = layer.fontSize * (side / postW);
  const fill = layer.fill;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <textarea
      ref={ref}
      value={layer.text}
      aria-label="Edit text"
      spellCheck={false}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          onDone();
        }
      }}
      className="absolute resize-none overflow-hidden border-0 p-0 outline-[1.5px] outline-offset-4 outline-cyan outline-solid [field-sizing:content] selection:bg-cyan/40"
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        width: layer.width * side,
        minHeight: fontSize * layer.lineHeight,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        fontFamily: fontStack(layer.fontFamily),
        fontWeight: nearestWeight(layer.fontFamily, layer.fontWeight),
        fontSize,
        lineHeight: layer.lineHeight,
        letterSpacing: `${layer.letterSpacing / 100}em`,
        textTransform: layer.uppercase ? "uppercase" : "none",
        textAlign: layer.align,
        color: layer.color,
        caretColor: layer.color,
        textShadow: layer.shadow ? `0 ${fontSize * 0.05}px ${fontSize * 0.18}px rgba(0,0,0,0.45)` : undefined,
        background:
          fill.mode === "none" ? "transparent" : `color-mix(in srgb, ${fill.color} ${fill.opacity}%, transparent)`,
        borderRadius: fill.mode === "none" ? 0 : (fill.radius / 100) * fontSize * 0.6,
      }}
    />
  );
}

/** Selectable, draggable box over a text or sticker; all four corners scale it from the centre. */
function LayerHandle({
  box,
  side,
  sideY,
  label,
  selected,
  resizeValue,
  min,
  max,
  onSelect,
  onEdit,
  onMove,
  onResize,
  onGuides,
}: {
  box: TextBox;
  side: number;
  sideY: number;
  label: string;
  selected: boolean;
  resizeValue: number;
  min: number;
  max: number;
  onSelect: () => void;
  onEdit?: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (value: number) => void;
  onGuides: (g: { v: boolean; h: boolean }) => void;
}) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const scaleDrag = useRef<{ left: number; top: number; value: number; dist: number } | null>(null);

  const centreDist = (e: ReactPointerEvent, left: number, top: number) =>
    Math.hypot(e.clientX - left - box.cx * side, e.clientY - top - box.cy * sideY);

  return (
    <div data-sheet className="pointer-events-none absolute inset-0">
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={selected}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.focus();
          onSelect();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, x: box.cx, y: box.cy };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          let x = d.x + (e.clientX - d.px) / side;
          let y = d.y + (e.clientY - d.py) / sideY;
          const v = Math.abs(x - 0.5) < SNAP;
          const h = Math.abs(y - 0.5) < SNAP;
          if (v) x = 0.5;
          if (h) y = 0.5;
          onGuides({ v, h });
          onMove(clamp01(x), clamp01(y));
        }}
        onPointerUp={() => {
          drag.current = null;
          onGuides({ v: false, h: false });
        }}
        onPointerCancel={() => {
          drag.current = null;
          onGuides({ v: false, h: false });
        }}
        onDoubleClick={(e) => {
          // Keep the photo's own double-click (reposition) from firing underneath.
          e.stopPropagation();
          onEdit?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEdit) onEdit();
        }}
        className={cn(
          "pointer-events-auto absolute cursor-move touch-none outline-none",
          selected
            ? "ring-[1.5px] ring-cyan"
            : "hover:ring-1 hover:ring-cyan/70 focus-visible:ring-[1.5px] focus-visible:ring-cyan",
        )}
        style={{
          left: `${(box.cx - box.w / 2) * 100}%`,
          top: `${(box.cy - box.h / 2) * 100}%`,
          width: `${box.w * 100}%`,
          height: `${box.h * 100}%`,
          transform: `rotate(${box.rotation}deg)`,
        }}
      >
        {selected &&
          CORNERS.map((c) => (
            <span
              key={c.pos}
              aria-label="Drag to resize"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.closest("[data-sheet]")!.getBoundingClientRect();
                scaleDrag.current = { left: rect.left, top: rect.top, value: resizeValue, dist: centreDist(e, rect.left, rect.top) };
              }}
              onPointerMove={(e) => {
                const s = scaleDrag.current;
                if (!s) return;
                const ratio = centreDist(e, s.left, s.top) / Math.max(1, s.dist);
                onResize(Math.round(Math.min(max, Math.max(min, s.value * ratio))));
              }}
              onPointerUp={() => (scaleDrag.current = null)}
              onPointerCancel={() => (scaleDrag.current = null)}
              onDoubleClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute size-2.5 touch-none bg-sheet ring-[1.5px] ring-cyan after:absolute after:-inset-2 hover:bg-cyan",
                c.pos,
                c.cursor,
              )}
            />
          ))}
      </div>
    </div>
  );
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function sameBoxes(a: TextBox[], b: TextBox[]) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i];
    return x.id === y.id && x.cx === y.cx && x.cy === y.cy && x.w === y.w && x.h === y.h && x.rotation === y.rotation;
  });
}

/** Corner crop marks and registration targets, as on a press proof. */
function ProofMarks({ active, w, h }: { active: boolean; w: number; h: number }) {
  // In crop mode the marks thicken to echo the live crop frame.
  const stroke = "var(--ink)";
  const width = active ? 2 : 1;
  const len = 18;
  const off = 8;
  const corners = [
    { x: 0, y: 0, sx: -1, sy: -1 },
    { x: w, y: 0, sx: 1, sy: -1 },
    { x: 0, y: h, sx: -1, sy: 1 },
    { x: w, y: h, sx: 1, sy: 1 },
  ];
  const targets = [
    { x: w / 2, y: -22 },
    { x: -22, y: h / 2 },
    { x: w + 22, y: h / 2 },
  ];
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {corners.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <line x1={c.sx * off} y1={0} x2={c.sx * (off + len)} y2={0} stroke={stroke} strokeWidth={width} />
          <line x1={0} y1={c.sy * off} x2={0} y2={c.sy * (off + len)} stroke={stroke} strokeWidth={width} />
        </g>
      ))}
      {targets.map((t, i) => (
        <g key={`t${i}`} transform={`translate(${t.x} ${t.y})`} stroke="var(--ink)" strokeOpacity={0.5} strokeWidth={1} fill="none">
          <circle r={6} />
          <line x1={-10} y1={0} x2={10} y2={0} />
          <line x1={0} y1={-10} x2={0} y2={10} />
        </g>
      ))}
    </svg>
  );
}

function ColourBar({ zoom, label, dims }: { zoom: number; label: string; dims: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-center gap-4 overflow-hidden px-4 text-ink-soft">
      <div aria-hidden className="flex shrink-0">
        {["var(--cyan)", "var(--magenta)", "var(--yellow)", "var(--ink)"].map((c) => (
          <span key={c} className="size-3" style={{ background: c }} />
        ))}
      </div>
      <span className="slug truncate text-[12px]">{label}</span>
      <span className="hidden font-mono text-[11px] tabular sm:inline">{dims}</span>
      <span className="font-mono text-[11px] tabular">{zoom}%</span>
    </div>
  );
}

function EmptySheet({
  video,
  onPickPhoto,
  onStartBlank,
}: {
  video: boolean;
  onPickPhoto: () => void;
  onStartBlank: () => void;
}) {
  const Icon = video ? Film : ImagePlus;
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="flex max-w-xs flex-col items-center text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-sheet text-magenta ring-1 ring-ink/10">
          <Icon className="size-5" />
        </span>
        <h2 className="text-lg font-semibold text-balance text-ink">{video ? "Start with a video" : "Start with a photo"}</h2>
        <p className="mt-1.5 text-sm text-pretty text-ink-soft">
          {video
            ? "Drop a clip here, or pick one from your computer. MP4 and WebM work best. Nothing is uploaded."
            : "Drop an image here, or pick one from your computer. JPG, PNG and WebP work. Nothing is uploaded."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={onPickPhoto} className="bg-magenta text-white hover:bg-magenta-ink">
            <Icon /> {video ? "Choose video" : "Choose photo"}
          </Button>
          {!video && (
            <Button variant="outline" onClick={onStartBlank}>
              <Palette /> Use a colour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

