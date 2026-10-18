"use client";

import { createElement, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Droplets, GripVertical, Grid3x3, ImageIcon, Layers, Palette, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconAction } from "./controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fontStack } from "@/lib/editor/fonts";
import { layerName, stackOrder } from "@/lib/editor/layers";
import { EMOJI_FONT, STICKER_ICONS } from "@/lib/editor/stickers";
import type { Assets } from "@/lib/editor/render";
import type { PostState } from "@/lib/editor/types";

/** How far the pointer must travel before a press becomes a drag. */
const DRAG_START = 4;

/** Every item on the post in one list, top first, reachable from any tool. Drag rows to restack. */
export function LayersMenu({
  state,
  assets,
  selectedId,
  onSelect,
  onSelectPhoto,
  onRestack,
  onMove,
  onDelete,
}: {
  state: PostState;
  assets: Assets;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectPhoto: () => void;
  onRestack: (id: string, dir: 1 | -1) => void;
  /** Put a layer at `index` in drawing order, 0 = bottom. */
  onMove: (id: string, index: number) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const stack = stackOrder(state).reverse();
  const count = stack.length + state.regions.length;

  // Drag state: which row is moving and the gap (0..n, in list order) it would drop into.
  const [drag, setDrag] = useState<{ id: string; slot: number } | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  const slotAt = (y: number) => {
    let slot = 0;
    stack.forEach((item, i) => {
      const r = rows.current.get(item.id)?.getBoundingClientRect();
      if (r && y > r.top + r.height / 2) slot = i + 1;
    });
    return slot;
  };

  const startPress = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-row-actions]")) return;
    const startY = e.clientY;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientY - startY) < DRAG_START) return;
      if (!dragging) {
        dragging = true;
        document.body.style.cursor = "grabbing";
      }
      ev.preventDefault();
      setDrag({ id, slot: slotAt(ev.clientY) });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = "";
      if (!dragging) return;
      // The press was a drag, so the click that follows must not select the row.
      window.addEventListener("click", (c) => c.stopPropagation(), { capture: true, once: true });
      setTimeout(() => setDrag(null), 0);
      if (ev.type === "pointercancel") return;
      const from = stack.findIndex((s) => s.id === id);
      const slot = slotAt(ev.clientY);
      const to = slot > from ? slot - 1 : slot;
      if (to !== from) onMove(id, stack.length - 1 - to);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label="Layers" />}>
        <Layers />
        <span className="hidden md:inline">Layers</span>
        {count > 0 && <span className="dim font-mono text-[11px] tabular">{count}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] gap-0 p-0">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-ink">Layers</h2>
          <span className="text-xs text-ink-soft">{stack.length > 1 ? "Drag to reorder" : "Top of the post first"}</span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5" aria-label="Layers">
          {stack.map((item, i) => {
            const active = item.id === selectedId;
            const dragging = drag?.id === item.id;
            return (
              <Row
                key={item.id}
                ref={(el) => {
                  if (el) rows.current.set(item.id, el);
                  else rows.current.delete(item.id);
                }}
                active={active}
                dragging={dragging}
                dropBefore={drag !== null && drag.slot === i}
                dropAfter={drag !== null && i === stack.length - 1 && drag.slot === stack.length}
                draggable
                onPointerDown={(e) => startPress(e, item.id)}
                onKeyDown={(e) => {
                  if (!e.altKey) return;
                  if (e.key === "ArrowUp" && i > 0) {
                    e.preventDefault();
                    onRestack(item.id, 1);
                  } else if (e.key === "ArrowDown" && i < stack.length - 1) {
                    e.preventDefault();
                    onRestack(item.id, -1);
                  }
                }}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                thumb={<Thumb item={item} assets={assets} />}
                name={layerName(item)}
                nameStyle={item.kind === "text" ? { fontFamily: fontStack(item.layer.fontFamily) } : undefined}
                actions={
                  <>
                    <IconAction size="icon-xs" label="Bring forward (Alt ↑)" disabled={i === 0} onClick={() => onRestack(item.id, 1)}>
                      <ArrowUp />
                    </IconAction>
                    <IconAction size="icon-xs" label="Send backward (Alt ↓)" disabled={i === stack.length - 1} onClick={() => onRestack(item.id, -1)}>
                      <ArrowDown />
                    </IconAction>
                    <IconAction size="icon-xs" label="Delete" destructive onClick={() => onDelete(item.id)}>
                      <Trash2 />
                    </IconAction>
                  </>
                }
              />
            );
          })}

          {state.regions.map((r, i) => (
            <Row
              key={r.id}
              active={r.id === selectedId}
              onClick={() => {
                onSelect(r.id);
                setOpen(false);
              }}
              thumb={r.kind === "blur" ? <Droplets className="size-4 text-ink-soft" /> : <Grid3x3 className="size-4 text-ink-soft" />}
              name={`${r.kind === "blur" ? "Blur" : "Pixelate"} area ${i + 1}`}
              actions={
                <IconAction size="icon-xs" label="Delete" destructive onClick={() => onDelete(r.id)}>
                  <Trash2 />
                </IconAction>
              }
            />
          ))}

          <Row
            active={false}
            onClick={() => {
              onSelectPhoto();
              setOpen(false);
            }}
            thumb={
              state.photoId && assets[state.photoId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assets[state.photoId].src} alt="" className="size-full object-cover" />
              ) : state.photoId ? (
                <ImageIcon className="size-4 text-ink-soft" />
              ) : (
                <Palette className="size-4 text-ink-soft" />
              )
            }
            name={
              state.media === "video"
                ? (state.video?.name ?? "No video yet")
                : state.photoId
                  ? (state.photoName ?? "Photo")
                  : "Background colour"
            }
            hint="Bottom"
          />
        </ul>
        {count === 0 && (
          <p className="border-t border-rule px-4 py-3 text-xs text-pretty text-ink-soft">
            Text and stickers you add show up here, so you can pick them even when they&apos;re hidden behind others.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Row({
  ref,
  active,
  dragging = false,
  dropBefore = false,
  dropAfter = false,
  draggable = false,
  onPointerDown,
  onKeyDown,
  onClick,
  thumb,
  name,
  nameStyle,
  hint,
  actions,
}: {
  ref?: React.Ref<HTMLLIElement>;
  active: boolean;
  dragging?: boolean;
  dropBefore?: boolean;
  dropAfter?: boolean;
  draggable?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onClick: () => void;
  thumb: React.ReactNode;
  name: string;
  nameStyle?: React.CSSProperties;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <li
      ref={ref}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative flex touch-none items-center gap-1 rounded-lg pr-1 select-none",
        active ? "bg-aqua-wash" : "hover:bg-tile",
        dragging && "z-10 bg-raised opacity-90 shadow-float ring-1 ring-brand/40",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      {dropBefore && <DropLine className="-top-[3px]" />}
      {dropAfter && <DropLine className="-bottom-[3px]" />}
      <button
        type="button"
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-current={active || undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 pr-2 pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <span className={cn("grid w-4 shrink-0 place-items-center text-ink-soft", !draggable && "invisible")} aria-hidden>
          <GripVertical className="size-4 opacity-40 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="checker grid size-9 shrink-0 place-items-center overflow-hidden rounded-md ring-1 ring-rule">
          {thumb}
        </span>
        <span className="truncate text-sm text-ink" style={nameStyle}>
          {name}
        </span>
        {hint && <span className="ml-auto shrink-0 text-xs text-ink-soft">{hint}</span>}
      </button>
      {actions && (
        <span
          data-row-actions
          className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          {actions}
        </span>
      )}
    </li>
  );
}

/** Where a dragged layer will land. */
function DropLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-x-1 z-20 h-[3px] rounded-full bg-brand", className)}>
      <span className="absolute -top-[3px] -left-1 size-[9px] rounded-full border-2 border-brand bg-raised" />
    </span>
  );
}

function Thumb({ item, assets }: { item: ReturnType<typeof stackOrder>[number]; assets: Assets }) {
  if (item.kind === "text") {
    return <Type className="size-4 text-brand" />;
  }
  const s = item.layer;
  if (s.kind === "emoji") {
    return (
      <span className="text-lg leading-none" style={{ fontFamily: EMOJI_FONT }}>
        {s.value}
      </span>
    );
  }
  if (s.kind === "icon") {
    const node = STICKER_ICONS[s.value];
    return (
      <svg viewBox="0 0 24 24" className="size-5 text-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {node?.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
      </svg>
    );
  }
  const img = assets[s.value];
  // eslint-disable-next-line @next/next/no-img-element
  return img ? <img src={img.src} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-4 text-ink-soft" />;
}
