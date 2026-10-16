"use client";

import { createElement, useState } from "react";
import { ArrowDown, ArrowUp, Droplets, Grid3x3, ImageIcon, Layers, Palette, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconAction } from "./controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fontStack } from "@/lib/editor/fonts";
import { stackOrder } from "@/lib/editor/layers";
import { EMOJI_FONT, STICKER_ICONS } from "@/lib/editor/stickers";
import type { Assets } from "@/lib/editor/render";
import type { PostState } from "@/lib/editor/types";

/** Every item on the post in one list, top first, reachable from any tool. */
export function LayersMenu({
  state,
  assets,
  selectedId,
  onSelect,
  onSelectPhoto,
  onRestack,
  onDelete,
}: {
  state: PostState;
  assets: Assets;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectPhoto: () => void;
  onRestack: (id: string, dir: 1 | -1) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const stack = stackOrder(state).reverse();
  const count = stack.length + state.regions.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 px-2 text-ink" aria-label="Layers" />}>
        <Layers />
        <span className="hidden md:inline">Layers</span>
        {count > 0 && <span className="font-mono text-[11px] text-ink-soft tabular">{count}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-ink">Layers</h2>
          <span className="text-xs text-ink-soft">Top of the post first</span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5" aria-label="Layers">
          {stack.map((item, i) => {
            const active = item.id === selectedId;
            return (
              <Row
                key={item.id}
                active={active}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                thumb={<Thumb item={item} assets={assets} />}
                name={
                  item.kind === "text"
                    ? item.layer.text.trim() || "Empty text"
                    : item.layer.kind === "emoji"
                      ? "Emoji"
                      : item.layer.kind === "icon"
                        ? `${item.layer.value.replace(/([a-z])([A-Z0-9])/g, "$1 $2")} icon`
                        : item.layer.value.startsWith("custom:")
                          ? "Sticker"
                          : "Image"
                }
                nameStyle={item.kind === "text" ? { fontFamily: fontStack(item.layer.fontFamily) } : undefined}
                actions={
                  <>
                    <IconAction size="icon-xs" label="Bring forward" disabled={i === 0} onClick={() => onRestack(item.id, 1)}>
                      <ArrowUp />
                    </IconAction>
                    <IconAction size="icon-xs" label="Send backward" disabled={i === stack.length - 1} onClick={() => onRestack(item.id, -1)}>
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
            name={state.photoId ? (state.photoName ?? "Photo") : "Background colour"}
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
  active,
  onClick,
  thumb,
  name,
  nameStyle,
  hint,
  actions,
}: {
  active: boolean;
  onClick: () => void;
  thumb: React.ReactNode;
  name: string;
  nameStyle?: React.CSSProperties;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <li className={cn("group flex items-center gap-1 rounded-md pr-1", active ? "bg-cyan-wash" : "hover:bg-muted")}>
      <button
        type="button"
        onClick={onClick}
        aria-current={active || undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        <span className="checker grid size-9 shrink-0 place-items-center overflow-hidden rounded-[4px] ring-1 ring-rule">
          {thumb}
        </span>
        <span className="truncate text-sm text-ink" style={nameStyle}>
          {name}
        </span>
        {hint && <span className="ml-auto shrink-0 text-xs text-ink-soft">{hint}</span>}
      </button>
      {actions && (
        <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </span>
      )}
    </li>
  );
}


function Thumb({ item, assets }: { item: ReturnType<typeof stackOrder>[number]; assets: Assets }) {
  if (item.kind === "text") {
    return <Type className="size-4 text-magenta" />;
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
