"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Copy,
  Film,
  Group,
  ImagePlus,
  Lock,
  LockOpen,
  Move,
  Palette,
  Trash2,
  Ungroup,
} from "lucide-react";
import { align, bounds, distribute, snap, type Align, type Box, type Snap } from "@/lib/editor/arrange";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  clampCrop,
  defaultCrop,
  exportDims,
  postDims,
  renderPost,
  type Assets,
  type Source,
  type TextBox,
} from "@/lib/editor/render";
import { fontStack, nearestWeight } from "@/lib/editor/fonts";
import { autoOutline, inkFor, mix } from "@/lib/editor/color";
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
import { useWatermark } from "@/lib/editor/watermark";

export type RegionDefaults = Pick<Region, "kind" | "shape" | "strength">;
export type LayerPatch = { id: string; patch: Partial<Pick<TextLayer, "x" | "y" | "fontSize" | "width">> & Partial<Pick<Sticker, "size">> };

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
  /** Current playback time in a reel, so layers show only inside their timing. */
  getTime?: () => number;
  regionDefaults: RegionDefaults;
  /** Every selected layer (several after Shift-click, a selection box or a group). */
  selectedIds: string[];
  /** `additive`: Shift-click adds or removes the layer instead of replacing the selection. */
  onSelect: (id: string | null, additive?: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  /** Change several layers at once (moving or scaling a selection, align, distribute). */
  onPatchMany: (patches: LayerPatch[], key: string) => void;
  onArrange: (action: "group" | "ungroup" | "lock" | "unlock" | "duplicate" | "delete") => void;
  onTextChange: (id: string, patch: Partial<TextLayer>, key: string) => void;
  onStickerChange: (id: string, patch: Partial<Sticker>, key: string) => void;
  onRegions: (fn: (regions: Region[]) => Region[], key?: string) => void;
  onCropChange: (crop: Crop, key: string) => void;
  onPickPhoto: () => void;
  onStartBlank: () => void;
  onDropFile: (file: File) => void;
  /** When set (bulk edit), every dropped file goes here instead. */
  onDropFiles?: (files: File[]) => void;
  /** Draw tool: a stroke starts, moves or ends at (x, y) in post fractions. */
  onDraw?: (phase: "start" | "move" | "end", x: number, y: number) => void;
};

/** Breathing room between the post and the edges of the workspace. */
const GUTTER = 28;
/** How close, in screen pixels, a dragged layer must come to a guide to snap to it. */
const SNAP_PX = 6;
/** Smart guide colour: a pink that stands out on photos and on the brand purple. */
const GUIDE = "#ff3d9a";

export function CanvasStage(props: Props) {
  const { source, assets, state, tool, selectedId, fontsVersion, showEmpty, clock, getTime } = props;
  // The watermark is a saved preference outside the design; redraw when it changes.
  const watermark = useWatermark();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Room available for the sheet, before the gutter. */
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [guides, setGuides] = useState<Snap | null>(null);
  /** Selection box being dragged on empty space, in fractions of the post. */
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(null);
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
      const next = renderPost(ctx, { source, assets, state, width: post.w, hideTextId: editing, time: getTime?.() });
      // Video frames redraw ~30 times a second; only touch React state when a box actually moved.
      setBoxes((prev) => (sameBoxes(prev, next) ? prev : next));
    };
    let raf = requestAnimationFrame(draw);
    clock?.addEventListener("frame", draw);

    // Animated stickers in a paused reel keep moving in the preview, carrying on from the
    // paused frame. While the video plays, its own frames drive them.
    const animated = state.media === "video" && (state.stickers.some((s) => s.kind === "animated" || s.kind === "gif") ||
        state.texts.some((t) => t.anim && t.anim.type !== "none"));
    let idle = 0;
    if (animated && getTime) {
      let from = performance.now();
      let at = getTime();
      let last = at;
      const loop = (now: number) => {
        const t = getTime();
        if (t !== last) {
          // Playing or seeking: follow the video.
          last = t;
          at = t;
          from = now;
        } else {
          const next = renderPost(ctx, { source, assets, state, width: post.w, hideTextId: editing, time: at + (now - from) / 1000 });
          setBoxes((prev) => (sameBoxes(prev, next) ? prev : next));
        }
        idle = requestAnimationFrame(loop);
      };
      idle = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(idle);
      raf = 0;
      clock?.removeEventListener("frame", draw);
    };
  }, [source, assets, state, cropping, fontsVersion, mounted, editing, post.w, clock, getTime, watermark]);

  useEffect(() => {
    if (!panning) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanTool(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panning]);

  const zoom = side ? Math.round((side / post.w) * 100) : 0;
  const drawing = tool === "draw" && !!props.onDraw;
  const showHandles = !blurring && !panning && !drawing;

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
        const files = Array.from(e.dataTransfer.files);
        if (props.onDropFiles) props.onDropFiles(files);
        else if (files[0]) props.onDropFile(files[0]);
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
                className="relative size-full bg-white shadow-sheet"
                onPointerDown={(e) => {
                  if (e.target !== e.currentTarget && e.target !== canvasRef.current) return;
                  // Empty space: a click clears the selection, a drag draws a selection box.
                  if (!showHandles) return props.onSelect(null);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const r = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - r.left) / r.width;
                  const y = (e.clientY - r.top) / r.height;
                  setMarquee({ x0: x, y0: y, x1: x, y1: y, add: e.shiftKey });
                }}
                onPointerMove={(e) => {
                  if (!marquee) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setMarquee({ ...marquee, x1: clamp01((e.clientX - r.left) / r.width), y1: clamp01((e.clientY - r.top) / r.height) });
                }}
                onPointerUp={() => {
                  if (!marquee) return;
                  const l = Math.min(marquee.x0, marquee.x1), rt = Math.max(marquee.x0, marquee.x1);
                  const t = Math.min(marquee.y0, marquee.y1), b = Math.max(marquee.y0, marquee.y1);
                  setMarquee(null);
                  if ((rt - l) * side < 4 && (b - t) * sideY < 4) return props.onSelect(null);
                  const hit = boxes
                    .filter((x) => x.cx + x.w / 2 > l && x.cx - x.w / 2 < rt && x.cy + x.h / 2 > t && x.cy - x.h / 2 < b)
                    .map((x) => x.id);
                  props.onSelectMany(marquee.add ? [...new Set([...props.selectedIds, ...hit])] : hit);
                }}
                onPointerCancel={() => setMarquee(null)}
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

                {guides?.xs.map((x) => (
                  <span key={`x${x}`} aria-hidden data-guide className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2" style={{ left: `${x * 100}%`, background: GUIDE }} />
                ))}
                {guides?.ys.map((y) => (
                  <span key={`y${y}`} aria-hidden data-guide className="pointer-events-none absolute inset-x-0 h-px -translate-y-1/2" style={{ top: `${y * 100}%`, background: GUIDE }} />
                ))}
                {guides?.gaps.map((g) => (
                  <span
                    key={`${g.axis}${g.from}${g.to}`}
                    aria-hidden
                    data-guide
                    className={cn("pointer-events-none absolute grid place-items-center", g.axis === "x" ? "h-px -translate-y-1/2" : "w-px -translate-x-1/2")}
                    style={
                      g.axis === "x"
                        ? { left: `${g.from * 100}%`, width: `${(g.to - g.from) * 100}%`, top: `${g.at * 100}%`, background: GUIDE }
                        : { top: `${g.from * 100}%`, height: `${(g.to - g.from) * 100}%`, left: `${g.at * 100}%`, background: GUIDE }
                    }
                  >
                    <span className="rounded px-1 font-mono text-[10px] leading-4 text-white tabular" style={{ background: GUIDE }}>
                      {Math.round((g.to - g.from) * (g.axis === "x" ? post.w : post.h))}
                    </span>
                  </span>
                ))}
                {marquee && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute border border-aqua bg-aqua/10"
                    style={{
                      left: `${Math.min(marquee.x0, marquee.x1) * 100}%`,
                      top: `${Math.min(marquee.y0, marquee.y1) * 100}%`,
                      width: `${Math.abs(marquee.x1 - marquee.x0) * 100}%`,
                      height: `${Math.abs(marquee.y1 - marquee.y0) * 100}%`,
                    }}
                  />
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
                          label={`${s.kind === "emoji" ? `Emoji ${s.value}` : s.kind === "icon" ? "Icon" : s.kind === "shape" ? "Shape" : s.kind === "frame" ? "Frame" : s.kind === "animated" ? "Animated sticker" : s.kind === "gif" ? "GIF" : s.kind === "chart" ? "Chart" : s.kind === "table" ? "Table" : s.kind === "qr" ? "QR code" : "Sticker"}`}
                          selected={props.selectedIds.includes(box.id)}
                          single={props.selectedIds.length <= 1}
                          locked={!!s.locked}
                          others={boxes.filter((o) => o.id !== box.id)}
                          threshold={{ x: SNAP_PX / side, y: SNAP_PX / sideY }}
                          resizeValue={s.size}
                          min={24}
                          max={1400}
                          onSelect={(add) => props.onSelect(box.id, add)}
                          onMove={(x, y) => props.onStickerChange(s.id, { x, y }, `move:${s.id}`)}
                          onResize={(size) => props.onStickerChange(s.id, { size }, `size:${s.id}`)}
                          stretch={s.kind === "shape" || s.kind === "frame" || s.kind === "chart" || s.kind === "table" ? { size: s.size, aspect: s.aspect ?? 1 } : undefined}
                          onStretch={(size, aspect) => props.onStickerChange(s.id, { size, aspect }, `stretch:${s.id}`)}
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
                        selected={props.selectedIds.includes(box.id)}
                        single={props.selectedIds.length <= 1}
                        locked={!!layer.locked}
                        others={boxes.filter((o) => o.id !== box.id)}
                        threshold={{ x: SNAP_PX / side, y: SNAP_PX / sideY }}
                        resizeValue={layer.fontSize}
                        min={12}
                        max={400}
                        onSelect={(add) => props.onSelect(box.id, add)}
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

                {showHandles && props.selectedIds.length > 1 && (
                  <GroupBox
                    boxes={boxes.filter((b) => props.selectedIds.includes(b.id))}
                    all={boxes}
                    state={state}
                    side={side}
                    sideY={sideY}
                    threshold={{ x: SNAP_PX / side, y: SNAP_PX / sideY }}
                    onPatchMany={props.onPatchMany}
                    onGuides={setGuides}
                    onToggle={(id) => props.onSelect(id, true)}
                  />
                )}

                {drawing && (
                  <div
                    aria-label="Drawing area"
                    className="absolute inset-0 cursor-crosshair touch-none"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      const r = e.currentTarget.getBoundingClientRect();
                      props.onDraw!("start", (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
                    }}
                    onPointerMove={(e) => {
                      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      // Coalesced events keep fast strokes smooth.
                      const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
                      for (const ev of events) props.onDraw!("move", (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
                    }}
                    onPointerUp={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      props.onDraw!("end", (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
                    }}
                  />
                )}

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
                    tone={inkFor(
                      state.background.kind === "gradient"
                        ? mix(state.background.from, state.background.to)
                        : state.background.from,
                    )}
                    onPickPhoto={props.onPickPhoto}
                    onStartBlank={props.onStartBlank}
                  />
                )}
              </div>
            )}

            {dragOver && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-aqua-wash/90 ring-2 ring-aqua ring-inset">
                <p className="px-4 text-center text-sm font-semibold text-aqua-ink">
                  {props.onDropFiles
                    ? `Drop to add ${state.media === "video" ? "videos" : "photos"} to bulk edit`
                    : state.media === "video"
                      ? "Drop a video, or an image to add as a sticker"
                      : "Drop to use this photo"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showHandles && !editing && props.selectedIds.length > 0 && boxes.some((b) => props.selectedIds.includes(b.id)) && (
        <ArrangeBar
          state={state}
          ids={props.selectedIds}
          boxes={boxes}
          onPatchMany={props.onPatchMany}
          onArrange={props.onArrange}
        />
      )}

      <StatusPill
        zoom={zoom}
        dims={`${exportDims(state).w} × ${exportDims(state).h} px`}
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
      className="absolute inset-0 cursor-grab touch-none select-none outline-2 -outline-offset-2 outline-aqua outline-dashed active:cursor-grabbing"
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
          className="rounded-full bg-sheet px-2.5 py-1 font-semibold text-ink outline-none hover:bg-aqua-wash focus-visible:ring-2 focus-visible:ring-aqua"
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
                ? "ring-[1.5px] ring-aqua"
                : "ring-1 ring-white/80 [box-shadow:0_0_0_2px_oklch(0.2_0.012_260/0.35)] hover:ring-aqua focus-visible:ring-aqua",
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
                  className={cn("absolute size-2.5 bg-white ring-[1.5px] ring-aqua after:absolute after:-inset-2", c.pos, c.cursor)}
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
      className="absolute resize-none overflow-hidden border-0 p-0 outline-[1.5px] outline-offset-4 outline-aqua outline-solid [field-sizing:content] selection:bg-aqua/40"
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
        WebkitTextStroke: layer.outline?.on
          ? `${(layer.outline.width / 100) * fontSize * 0.32}px ${layer.outline.color === "auto" ? autoOutline(layer.color) : layer.outline.color}`
          : undefined,
        paintOrder: "stroke fill",
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
  single,
  locked,
  others,
  threshold,
  resizeValue,
  min,
  max,
  onSelect,
  onEdit,
  onMove,
  onResize,
  stretch,
  onStretch,
  onGuides,
}: {
  box: TextBox;
  side: number;
  sideY: number;
  label: string;
  selected: boolean;
  /** Only one layer is selected, so this one shows its own resize handles. */
  single: boolean;
  locked: boolean;
  /** The other layers, for smart guides. */
  others: Box[];
  threshold: { x: number; y: number };
  resizeValue: number;
  min: number;
  max: number;
  onSelect: (additive: boolean) => void;
  onEdit?: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (value: number) => void;
  /** Shapes: width and width/height, changed by the edge handles. */
  stretch?: { size: number; aspect: number };
  onStretch?: (size: number, aspect: number) => void;
  onGuides: (g: Snap | null) => void;
}) {
  const handles = selected && single && !locked;
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const edgeDrag = useRef<{ left: number; top: number; axis: "x" | "y"; dist: number; size: number; aspect: number } | null>(null);
  // Distance from the centre along the shape's own (rotated) axis.
  const axisDist = (e: ReactPointerEvent, left: number, top: number, axis: "x" | "y") => {
    const dx = e.clientX - left - box.cx * side;
    const dy = e.clientY - top - box.cy * sideY;
    const a = (-box.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(axis === "x" ? lx : ly);
  };
  const scaleDrag = useRef<{ left: number; top: number; value: number; dist: number } | null>(null);

  const centreDist = (e: ReactPointerEvent, left: number, top: number) =>
    Math.hypot(e.clientX - left - box.cx * side, e.clientY - top - box.cy * sideY);

  return (
    <div data-sheet className="pointer-events-none absolute inset-0">
      <div
        role="button"
        tabIndex={0}
        aria-label={locked ? `${label} Locked.` : label}
        aria-pressed={selected}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.focus();
          onSelect(e.shiftKey);
          if (e.shiftKey || locked) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, x: box.cx, y: box.cy };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const x = d.x + (e.clientX - d.px) / side;
          const y = d.y + (e.clientY - d.py) / sideY;
          // Smart guides: snap to the page and to the other layers' edges and centres.
          const s = snap({ id: box.id, cx: x, cy: y, w: box.w, h: box.h }, others, threshold);
          onGuides(s);
          onMove(clamp01(x + s.dx), clamp01(y + s.dy));
        }}
        onPointerUp={() => {
          drag.current = null;
          onGuides(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          onGuides(null);
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
          "pointer-events-auto absolute touch-none outline-none",
          locked ? "cursor-default" : "cursor-move",
          selected
            ? "ring-[1.5px] ring-aqua"
            : "hover:ring-1 hover:ring-aqua/70 focus-visible:ring-[1.5px] focus-visible:ring-aqua",
        )}
        style={{
          left: `${(box.cx - box.w / 2) * 100}%`,
          top: `${(box.cy - box.h / 2) * 100}%`,
          width: `${box.w * 100}%`,
          height: `${box.h * 100}%`,
          transform: `rotate(${box.rotation}deg)`,
        }}
      >
        {handles &&
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
                "absolute size-2.5 touch-none bg-white ring-[1.5px] ring-aqua after:absolute after:-inset-2 hover:bg-aqua",
                c.pos,
                c.cursor,
              )}
            />
          ))}
        {handles &&
          stretch &&
          onStretch &&
          EDGES.map((edge) => (
            <span
              key={edge.pos}
              aria-label={edge.axis === "x" ? "Drag to change the width" : "Drag to change the height"}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.closest("[data-sheet]")!.getBoundingClientRect();
                edgeDrag.current = {
                  left: rect.left,
                  top: rect.top,
                  axis: edge.axis,
                  dist: Math.max(1, axisDist(e, rect.left, rect.top, edge.axis)),
                  size: stretch.size,
                  aspect: stretch.aspect,
                };
              }}
              onPointerMove={(e) => {
                const d = edgeDrag.current;
                if (!d) return;
                const ratio = Math.max(0.05, axisDist(e, d.left, d.top, d.axis) / d.dist);
                if (d.axis === "x") {
                  const size = Math.round(Math.min(max * 2, Math.max(min, d.size * ratio)));
                  onStretch(size, Math.min(80, Math.max(0.05, (d.aspect * size) / d.size)));
                } else {
                  onStretch(d.size, Math.min(80, Math.max(0.05, d.aspect / ratio)));
                }
              }}
              onPointerUp={() => (edgeDrag.current = null)}
              onPointerCancel={() => (edgeDrag.current = null)}
              onDoubleClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute touch-none rounded-full bg-white ring-[1.5px] ring-aqua after:absolute after:-inset-2 hover:bg-aqua",
                edge.pos,
                edge.cursor,
              )}
            />
          ))}
      </div>
    </div>
  );
}

const layerById = (state: PostState, id: string): TextLayer | Sticker | undefined =>
  state.texts.find((t) => t.id === id) ?? state.stickers.find((s) => s.id === id);

/** Several selected layers: drag inside to move them all (with smart guides), corners scale them all. */
function GroupBox({
  boxes,
  all,
  state,
  side,
  sideY,
  threshold,
  onPatchMany,
  onGuides,
  onToggle,
}: {
  boxes: TextBox[];
  all: TextBox[];
  state: PostState;
  side: number;
  sideY: number;
  threshold: { x: number; y: number };
  onPatchMany: (patches: LayerPatch[], key: string) => void;
  onGuides: (g: Snap | null) => void;
  onToggle: (id: string) => void;
}) {
  const u = bounds(boxes);
  const drag = useRef<{ px: number; py: number; start: TextBox[]; u: ReturnType<typeof bounds> } | null>(null);
  const scale = useRef<{ left: number; top: number; dist: number; start: TextBox[]; u: ReturnType<typeof bounds>; layers: (TextLayer | Sticker)[] } | null>(null);
  const movable = (b: TextBox) => !layerById(state, b.id)?.locked;
  const others = all.filter((b) => !boxes.some((s) => s.id === b.id));

  return (
    <div data-sheet className="pointer-events-none absolute inset-0">
      <div
        role="group"
        aria-label={`${boxes.length} layers selected. Drag to move them, drag a corner to resize them.`}
        className="pointer-events-auto absolute cursor-move touch-none outline-[1.5px] outline-aqua outline-dashed"
        style={{ left: `${u.l * 100}%`, top: `${u.t * 100}%`, width: `${u.w * 100}%`, height: `${u.h * 100}%` }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            // Shift-click inside the selection adds or removes the layer under the pointer.
            const r = e.currentTarget.closest("[data-sheet]")!.getBoundingClientRect();
            const x = (e.clientX - r.left) / side;
            const y = (e.clientY - r.top) / sideY;
            const hit = [...all].reverse().find((b) => Math.abs(x - b.cx) <= b.w / 2 && Math.abs(y - b.cy) <= b.h / 2);
            if (hit) onToggle(hit.id);
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, start: boxes, u };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = (e.clientX - d.px) / side;
          const dy = (e.clientY - d.py) / sideY;
          const s = snap({ id: "selection", cx: d.u.cx + dx, cy: d.u.cy + dy, w: d.u.w, h: d.u.h }, others, threshold);
          onGuides(s);
          onPatchMany(
            d.start.filter(movable).map((b) => ({ id: b.id, patch: { x: clamp01(b.cx + dx + s.dx), y: clamp01(b.cy + dy + s.dy) } })),
            "move:selection",
          );
        }}
        onPointerUp={() => {
          drag.current = null;
          onGuides(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          onGuides(null);
        }}
      >
        {CORNERS.map((c) => (
          <span
            key={c.pos}
            aria-label="Drag to resize the selection"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              const rect = e.currentTarget.closest("[data-sheet]")!.getBoundingClientRect();
              const dist = Math.hypot(e.clientX - rect.left - u.cx * side, e.clientY - rect.top - u.cy * sideY);
              scale.current = { left: rect.left, top: rect.top, dist: Math.max(1, dist), start: boxes, u, layers: boxes.map((b) => layerById(state, b.id)!) };
            }}
            onPointerMove={(e) => {
              const s = scale.current;
              if (!s) return;
              const k = Math.min(10, Math.max(0.1, Math.hypot(e.clientX - s.left - s.u.cx * side, e.clientY - s.top - s.u.cy * sideY) / s.dist));
              const patches: LayerPatch[] = [];
              s.start.forEach((b, i) => {
                const layer = s.layers[i];
                if (!layer || layer.locked) return;
                const x = clamp01(s.u.cx + (b.cx - s.u.cx) * k);
                const y = clamp01(s.u.cy + (b.cy - s.u.cy) * k);
                patches.push(
                  "fontSize" in layer
                    ? { id: b.id, patch: { x, y, fontSize: Math.round(Math.min(400, Math.max(12, layer.fontSize * k))), width: Math.min(1, layer.width * k) } }
                    : { id: b.id, patch: { x, y, size: Math.round(Math.min(1400, Math.max(24, layer.size * k))) } },
                );
              });
              onPatchMany(patches, "scale:selection");
            }}
            onPointerUp={() => (scale.current = null)}
            onPointerCancel={() => (scale.current = null)}
            className={cn("absolute size-2.5 touch-none bg-white ring-[1.5px] ring-aqua after:absolute after:-inset-2 hover:bg-aqua", c.pos, c.cursor)}
          />
        ))}
      </div>
    </div>
  );
}

const ALIGNS: { id: Align; label: string; Icon: typeof AlignStartVertical }[] = [
  { id: "left", label: "Align left", Icon: AlignStartVertical },
  { id: "center", label: "Align centre", Icon: AlignCenterVertical },
  { id: "right", label: "Align right", Icon: AlignEndVertical },
  { id: "top", label: "Align top", Icon: AlignStartHorizontal },
  { id: "middle", label: "Align middle", Icon: AlignCenterHorizontal },
  { id: "bottom", label: "Align bottom", Icon: AlignEndHorizontal },
];

/** Floating bar over the canvas for the selection: align, distribute, group, lock, duplicate, delete. */
function ArrangeBar({
  state,
  ids,
  boxes,
  onPatchMany,
  onArrange,
}: {
  state: PostState;
  ids: string[];
  boxes: TextBox[];
  onPatchMany: (patches: LayerPatch[], key: string) => void;
  onArrange: (action: "group" | "ungroup" | "lock" | "unlock" | "duplicate" | "delete") => void;
}) {
  const layers = ids.map((id) => layerById(state, id)).filter((l): l is TextLayer | Sticker => !!l);
  const sel = boxes.filter((b) => ids.includes(b.id));
  const free = sel.filter((b) => !layerById(state, b.id)?.locked);
  const locked = layers.length > 0 && layers.every((l) => l.locked);
  const grouped = layers.some((l) => l.group);
  const oneGroup = grouped && layers.every((l) => l.group === layers[0].group);
  const apply = (moves: { id: string; x: number; y: number }[], key: string) =>
    onPatchMany(
      moves.filter((m) => free.some((b) => b.id === m.id)).map((m) => ({ id: m.id, patch: { x: m.x, y: m.y } })),
      key,
    );
  const btn = "grid size-8 place-items-center rounded-full text-ink outline-none hover:bg-tile focus-visible:ring-2 focus-visible:ring-aqua disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div
      role="toolbar"
      aria-label={ids.length > 1 ? `Arrange ${ids.length} layers` : "Arrange layer"}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-2 left-1/2 z-10 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full bg-raised p-1 shadow-float"
    >
      {ALIGNS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={btn} aria-label={ids.length > 1 ? label : `${label} on the page`} title={label} onClick={() => apply(align(sel, id), `align:${id}`)}>
          <Icon className="size-4" />
        </button>
      ))}
      {ids.length > 2 && (
        <>
          <button type="button" className={btn} aria-label="Space evenly across" title="Space evenly across" onClick={() => apply(distribute(sel, "x"), "distribute:x")}>
            <AlignHorizontalDistributeCenter className="size-4" />
          </button>
          <button type="button" className={btn} aria-label="Space evenly down" title="Space evenly down" onClick={() => apply(distribute(sel, "y"), "distribute:y")}>
            <AlignVerticalDistributeCenter className="size-4" />
          </button>
        </>
      )}
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-rule" />
      {ids.length > 1 && !oneGroup && (
        <button type="button" className={btn} aria-label="Group" title="Group (move together)" onClick={() => onArrange("group")}>
          <Group className="size-4" />
        </button>
      )}
      {grouped && (
        <button type="button" className={btn} aria-label="Ungroup" title="Ungroup" onClick={() => onArrange("ungroup")}>
          <Ungroup className="size-4" />
        </button>
      )}
      <button type="button" className={cn(btn, locked && "bg-brand-wash text-brand")} aria-label={locked ? "Unlock" : "Lock"} aria-pressed={locked} title={locked ? "Unlock" : "Lock position"} onClick={() => onArrange(locked ? "unlock" : "lock")}>
        {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
      </button>
      <button type="button" className={btn} aria-label="Duplicate" title="Duplicate (Ctrl+D)" onClick={() => onArrange("duplicate")}>
        <Copy className="size-4" />
      </button>
      <button type="button" className={cn(btn, "text-destructive")} aria-label="Delete" title="Delete" onClick={() => onArrange("delete")}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const EDGES = [
  { pos: "left-1/2 -top-1 h-2 w-5 -translate-x-1/2", cursor: "cursor-ns-resize", axis: "y" },
  { pos: "left-1/2 -bottom-1 h-2 w-5 -translate-x-1/2", cursor: "cursor-ns-resize", axis: "y" },
  { pos: "top-1/2 -left-1 h-5 w-2 -translate-y-1/2", cursor: "cursor-ew-resize", axis: "x" },
  { pos: "top-1/2 -right-1 h-5 w-2 -translate-y-1/2", cursor: "cursor-ew-resize", axis: "x" },
] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function sameBoxes(a: TextBox[], b: TextBox[]) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i];
    return x.id === y.id && x.cx === y.cx && x.cy === y.cy && x.w === y.w && x.h === y.h && x.rotation === y.rotation;
  });
}

/** Floating readout under the canvas: what the pointer does now, the export size and the zoom. */
function StatusPill({ zoom, label, dims }: { zoom: number; label: string; dims: string }) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center justify-center px-3">
      <div className="flex h-8 max-w-full items-center gap-3 overflow-hidden rounded-full bg-raised px-3.5 text-[12px] text-ink-soft shadow-float">
        <span className="truncate text-ink">{t(label)}</span>
        <span aria-hidden className="h-3.5 w-px shrink-0 bg-rule" />
        <span className="hidden shrink-0 font-mono text-[11px] tabular sm:inline">{dims}</span>
        <span className="shrink-0 rounded-full bg-tile px-2 py-0.5 font-mono text-[11px] text-ink tabular">{zoom}%</span>
      </div>
    </div>
  );
}

function EmptySheet({
  video,
  tone,
  onPickPhoto,
  onStartBlank,
}: {
  video: boolean;
  /** Type colour that reads on the current background. */
  tone: "dark" | "light";
  onPickPhoto: () => void;
  onStartBlank: () => void;
}) {
  const Icon = video ? Film : ImagePlus;
  return (
    <div className="@container absolute inset-0 grid place-items-center p-4">
      <div className="flex max-w-xs flex-col items-center text-center">
        <span className="mb-4 grid size-12 @max-xs:hidden place-items-center rounded-full bg-white text-[#7d2ae8] shadow-[0_2px_8px_rgb(0_0_0/0.12)]">
          <Icon className="size-5" />
        </span>
        <h2 className={cn("text-lg font-semibold text-balance", tone === "dark" ? "text-[#0e1318]" : "text-white")}>
          {video ? "Start with a video" : "Start with a photo"}
        </h2>
        <p className={cn("mt-1.5 text-sm text-pretty @max-xs:hidden", tone === "dark" ? "text-[#0e1318]/70" : "text-white/80")}>
          {video
            ? "Drop a clip here, or pick one from your computer. MP4 and WebM work best. Nothing is uploaded."
            : "Drop an image here, or pick one from your computer. JPG, PNG and WebP work. Nothing is uploaded."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 @max-xs:mt-3">
          <Button onClick={onPickPhoto}>
            <Icon /> {video ? "Choose video" : "Choose photo"}
          </Button>
          {!video && (
            <Button variant="outline" onClick={onStartBlank} className="border-black/10 bg-white text-[#0e1318] hover:bg-white/90 hover:text-[#0e1318] dark:border-black/10 dark:bg-white dark:hover:bg-white/90">
              <Palette /> Use a colour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

