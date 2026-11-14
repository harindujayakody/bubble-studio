"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Images, PencilLine, Upload, X } from "lucide-react";
import { ensureExportFolder, saveExport } from "@/lib/editor/save";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PanelSection, RangeField } from "./controls";
import { ensureFonts, exportDims, fitExport, orientImage, renderPost, type Assets } from "@/lib/editor/render";
import type { PostState } from "@/lib/editor/types";
import type { LibraryTrack } from "@/lib/editor/sticker-library";
import { canFastExport, fastExportReel, reelDesignFor } from "@/lib/editor/fast-export";
import { formatTime } from "@/lib/editor/video";
import { reelLength } from "@/lib/editor/segments";

export type BulkPhoto = {
  id: string;
  name: string;
  img: HTMLImageElement;
  file: Blob;
  /** Its own design, once edited on its own ("Edit each photo separately"). */
  design?: PostState;
};

/** The current design applied to another photo: same look, text and stickers; the photo framed fresh. */
function designFor(state: PostState, photo: BulkPhoto): PostState {
  return {
    ...state,
    photoId: photo.id,
    photoName: photo.name,
    crop: null,
    orientation: { rotation: 0, flipX: false, flipY: false },
    custom: fitExport(photo.img.naturalWidth, photo.img.naturalHeight),
  };
}

/** Optional differences between bulk items, so a batch doesn't look copy-pasted. */
export type BulkVariations = {
  /** A different gentle filter on each item. */
  randomLook: boolean;
  /** Move text a little on each item. */
  nudgeText: boolean;
  /** One line per item, in order; replaces the chosen text layer's words. */
  texts: string;
  /** Which text layer the lines replace; defaults to the top one. */
  textTarget: string | null;
  /** Reels: a different library track on each clip, at `musicVolume`. */
  randomMusic: boolean;
  musicVolume: number;
};

export const NO_VARIATIONS: BulkVariations = {
  randomLook: false,
  nudgeText: false,
  texts: "",
  textTarget: null,
  randomMusic: false,
  musicVolume: 70,
};

// Soft looks only, at moderate strength, so no item comes out over-saturated.
const GENTLE_LOOKS = ["vivid", "golden", "coastal", "film", "matte", "rosy", "clarendon", "gingham", "lark", "valencia", "crema", "tt-glow", "tt-soft", "sc-chill", "sc-sunny"];

/** A stable number in [0, 1) for an item, so previews and exports pick the same variation. */
function seeded(id: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** Apply the chosen variations to one item's copy of the shared design. */
export function varyDesign(
  design: PostState,
  id: string,
  index: number,
  v: BulkVariations,
  tracks: LibraryTrack[] = [],
): PostState {
  let next = design;
  if (v.randomMusic && tracks.length && next.media === "video") {
    const t = tracks[Math.floor(seeded(id, 3) * tracks.length)];
    // Duration is read from the file when the reel is mixed; loop and fade fit it to the clip.
    next = {
      ...next,
      music: { id: t.src, name: t.name, src: t.src, duration: 0, offset: 0, volume: v.musicVolume, on: true, loop: true, fade: true },
    };
  }
  if (v.randomLook) {
    next = {
      ...next,
      filter: GENTLE_LOOKS[Math.floor(seeded(id, 1) * GENTLE_LOOKS.length)],
      filterStrength: 55 + Math.round(seeded(id, 2) * 25),
    };
  }
  if (v.nudgeText) {
    // A few percent at most, so text stays roughly where it was designed (and off faces).
    const clamp = (n: number) => Math.min(0.94, Math.max(0.06, n));
    next = {
      ...next,
      texts: next.texts.map((t, i) => ({
        ...t,
        x: clamp(t.x + (seeded(id, 10 + i) - 0.5) * 0.05),
        y: clamp(t.y + (seeded(id, 30 + i) - 0.5) * 0.04),
        rotation: t.rotation + (seeded(id, 50 + i) - 0.5) * 3,
      })),
    };
  }
  const line = v.texts.split("\n")[index]?.trim();
  if (line && next.texts.length) {
    const target = next.texts.find((t) => t.id === v.textTarget) ?? [...next.texts].sort((a, b) => b.z - a.z)[0];
    next = { ...next, texts: next.texts.map((t) => (t.id === target.id ? { ...t, text: line } : t)) };
  }
  return next;
}

/** The design a photo exports with: its own when edited separately, otherwise the shared one. */
export function bulkDesign(
  state: PostState,
  photo: BulkPhoto,
  separate: PostState | null,
  v: BulkVariations = NO_VARIATIONS,
  index = 0,
): PostState {
  if (!separate) return varyDesign(designFor(state, photo), photo.id, index, v);
  // The photo on the canvas is being edited now; others keep their own edits, or start from
  // the design that was shared when separate editing was turned on.
  if (state.photoId === photo.id) return state;
  return photo.design ?? varyDesign(designFor(separate, photo), photo.id, index, v);
}

/** Variations: random look, nudged text and a text line per item. Shared by both bulk panels. */
function VariationsSection({
  state,
  count,
  noun,
  value,
  onChange,
  children,
}: {
  state: PostState;
  count: number;
  noun: string;
  value: BulkVariations;
  onChange: (v: BulkVariations) => void;
  /** Extra options for this kind of item (reels add music). */
  children?: React.ReactNode;
}) {
  const lines = value.texts.split("\n").filter((l) => l.trim()).length;
  return (
    <PanelSection title="Variations">
      <div className="grid gap-3">
        <label className="flex items-start justify-between gap-3">
          <span className="grid gap-0.5">
            <span className="text-[13px] font-medium text-ink">Random look</span>
            <span className="text-xs text-pretty text-ink-soft">A different soft filter on each {noun}, never over the top.</span>
          </span>
          <Switch checked={value.randomLook} onCheckedChange={(randomLook) => onChange({ ...value, randomLook })} aria-label="Random look" />
        </label>
        <label className="flex items-start justify-between gap-3">
          <span className="grid gap-0.5">
            <span className="text-[13px] font-medium text-ink">Nudge text</span>
            <span className="text-xs text-pretty text-ink-soft">Shifts text slightly on each {noun} so they don&apos;t look identical.</span>
          </span>
          <Switch checked={value.nudgeText} onCheckedChange={(nudgeText) => onChange({ ...value, nudgeText })} aria-label="Nudge text" />
        </label>
        {children}
        <div className="grid gap-1.5">
          <label htmlFor="bulk-texts" className="text-[13px] font-medium text-ink">
            Text for each {noun}
          </label>
          {state.texts.length === 0 ? (
            <p className="text-xs text-pretty text-ink-soft">Add a text to the design first; each line below then replaces it.</p>
          ) : (
            <>
              {state.texts.length > 1 && (
                <select
                  value={value.textTarget ?? ""}
                  onChange={(e) => onChange({ ...value, textTarget: e.target.value || null })}
                  className="h-9 rounded-lg border border-input bg-sheet px-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-aqua"
                  aria-label="Text layer to replace"
                >
                  <option value="">Top text layer</option>
                  {state.texts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.text.trim().slice(0, 32) || "Empty text"}
                    </option>
                  ))}
                </select>
              )}
              <Textarea
                id="bulk-texts"
                rows={4}
                value={value.texts}
                onChange={(e) => onChange({ ...value, texts: e.target.value })}
                placeholder={`Hello ${noun} 01\nHello ${noun} 02\n…`}
                className="font-mono text-[13px]"
              />
              <p className="text-xs text-ink-soft">
                One line per {noun}, in order · {lines} of {count} filled. Empty lines keep the design&apos;s text.
              </p>
            </>
          )}
        </div>
      </div>
    </PanelSection>
  );
}

function render(design: PostState, photo: BulkPhoto, assets: Assets, width?: number) {
  const source = orientImage(photo.img, design.orientation);
  const dims = exportDims(design);
  const w = width ?? dims.w;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = Math.round((dims.h / dims.w) * w);
  renderPost(canvas.getContext("2d")!, { source, assets, state: design, width: w });
  return canvas;
}

/** Wraps a bulk panel so files dropped anywhere on it are added. */
function DropArea({
  accept,
  label,
  onFiles,
  children,
}: {
  accept: (f: File) => boolean;
  label: string;
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className="relative min-h-full"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        const ok = files.filter(accept);
        if (ok.length < files.length) toast("Some files were skipped", { description: `Only ${label} can be added here.` });
        if (ok.length) onFiles(ok);
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-xl border-2 border-dashed border-aqua bg-aqua-wash/90">
          <p className="flex items-center gap-2 text-sm font-semibold text-aqua-ink">
            <Upload className="size-4" /> Drop {label} to add them
          </p>
        </div>
      )}
    </div>
  );
}

/** The empty state: a big target to click or drop on. */
function EmptyDrop({ onClick, label, hint }: { onClick: () => void; label: string; hint: string }) {
  return (
    <div className="px-4 pt-1 pb-6">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-rule px-4 py-10 text-center outline-none transition-colors hover:border-brand hover:bg-brand-wash/50 focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <span className="grid size-11 place-items-center rounded-full bg-brand-wash text-brand">
          <Images className="size-5" />
        </span>
        <span className="font-heading text-[15px] font-semibold text-ink">{label}</span>
        <span className="max-w-[30ch] text-[13px] text-pretty text-ink-soft">{hint}</span>
      </button>
    </div>
  );
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode an image."))), type, quality),
  );

/**
 * Bulk edit: design once, then apply the same filters, text, stickers and size to
 * many photos and download them together as a ZIP.
 */
export function BulkPanel({
  state,
  assets,
  photos,
  separate,
  onSeparate,
  variations,
  onVariations,
  onAdd,
  onFiles,
  onRemove,
  onOpen,
  onClear,
}: {
  state: PostState;
  assets: Assets;
  variations: BulkVariations;
  onVariations: (v: BulkVariations) => void;
  photos: BulkPhoto[];
  /** Each photo keeps its own edits; holds the shared design they start from. Null = one design for all. */
  separate: PostState | null;
  onSeparate: (on: boolean) => void;
  onAdd: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onOpen: (photo: BulkPhoto) => void;
  onClear: () => void;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [quality, setQuality] = useState(92);
  const [progress, setProgress] = useState<number | null>(null);
  const cancel = useRef(false);

  // Live previews follow every change to the design (debounced so sliders stay smooth).
  useEffect(() => {
    if (photos.length === 0) return;
    const timer = window.setTimeout(async () => {
      await ensureFonts(state);
      const next: Record<string, string> = {};
      photos.forEach((p, i) => {
        next[p.id] = render(bulkDesign(state, p, separate, variations, i), p, assets, 220).toDataURL("image/jpeg", 0.75);
      });
      setThumbs(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, assets, photos, separate, variations]);

  const exportAll = async () => {
    await ensureExportFolder();
    cancel.current = false;
    setProgress(0);
    try {
      for (const p of photos) await ensureFonts(bulkDesign(state, p, separate, variations));
      const files: Record<string, Uint8Array> = {};
      const ext = format === "jpeg" ? "jpg" : "png";
      const used = new Set<string>();
      for (let i = 0; i < photos.length; i++) {
        if (cancel.current) throw new DOMException("Cancelled", "AbortError");
        const p = photos[i];
        const blob = await toBlob(render(bulkDesign(state, p, separate, variations, i), p, assets), `image/${format}`, format === "jpeg" ? quality / 100 : undefined);
        let name = `${p.name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "photo"}-bubble`;
        for (let n = 2; used.has(name); n++) name = `${name}-${n}`;
        used.add(name);
        files[`${name}.${ext}`] = new Uint8Array(await blob.arrayBuffer());
        setProgress((i + 1) / photos.length);
        // Let the progress bar paint between photos.
        await new Promise((r) => setTimeout(r, 0));
      }
      // Images are already compressed, so store them without zipping again.
      const zip = zipSync(files, { level: 0 });
      const blob = new Blob([zip as BlobPart], { type: "application/zip" });
      const filename = `bubble-studio-${photos.length}-posts.zip`;
      await saveExport(blob, filename, "photos");
      toast.success(`${photos.length} posts exported`, { description: `${filename} · ${(blob.size / 1048576).toFixed(1)} MB` });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") toast("Bulk export cancelled");
      else toast.error("Bulk export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setProgress(null);
    }
  };

  const dims = exportDims(state);
  const editedCount = photos.filter((p) => p.design).length;

  return (
    <DropArea accept={(f) => f.type.startsWith("image/") && f.type !== "image/svg+xml"} label="photos" onFiles={onFiles}>
      <PanelSection title="Bulk edit">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          {separate
            ? "Each photo keeps its own edits. Click a photo to edit it; your changes stay with that photo."
            : "Design one post, then add more photos. Each gets the same filters, adjustments, text, stickers and size, and you download them all at once."}
        </p>
        <label className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rule bg-tile/50 px-3 py-2.5">
          <span className="grid gap-0.5">
            <span className="text-[13px] font-medium text-ink">Edit each photo separately</span>
            <span className="text-xs text-pretty text-ink-soft">
              {separate
                ? editedCount
                  ? `${editedCount} of ${photos.length} edited on their own`
                  : "Click a photo to start editing it"
                : "Off: one design for every photo"}
            </span>
          </span>
          <Switch checked={!!separate} onCheckedChange={onSeparate} aria-label="Edit each photo separately" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAdd} disabled={progress !== null}>
            <ImagePlus /> Add photos
          </Button>
          {photos.length > 0 && (
            <Button variant="ghost" size="sm" className="self-center text-destructive hover:text-destructive" onClick={onClear} disabled={progress !== null}>
              Clear all
            </Button>
          )}
        </div>
      </PanelSection>

      {photos.length === 0 ? (
        <EmptyDrop onClick={onAdd} label="Drop photos here" hint="or click to choose several at once with Ctrl or Shift" />
      ) : (
        <>
          <PanelSection title={`${photos.length} photo${photos.length === 1 ? "" : "s"}`}>
            <ul className="grid grid-cols-2 gap-2">
              {photos.map((p) => (
                <li key={p.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(p)}
                    aria-label={separate ? `Edit ${p.name}` : `Open ${p.name} in the editor`}
                    className={cn(
                      "checker relative block w-full overflow-hidden rounded-lg ring-1 ring-rule outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                      state.photoId === p.id && "ring-2 ring-aqua",
                    )}
                  >
                    {thumbs[p.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[p.id]} alt={`Preview of ${p.name}`} className="block w-full" />
                    ) : (
                      <div className="aspect-square animate-pulse bg-muted" />
                    )}
                    {separate && (state.photoId === p.id || p.design) && (
                      <span
                        className={cn(
                          "absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          state.photoId === p.id ? "bg-aqua text-white" : "bg-sheet/90 text-ink",
                        )}
                      >
                        {state.photoId === p.id ? "Editing" : "Edited"}
                      </span>
                    )}
                  </button>
                  <p className="mt-1 truncate text-[11px] text-ink-soft" title={p.name}>
                    {p.name}
                  </p>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      onClick={() => onOpen(p)}
                      aria-label={`Edit ${p.name} in the editor`}
                      title="Open in the editor"
                      className="grid size-7 place-items-center rounded-full bg-sheet/95 text-ink shadow-sm outline-none hover:bg-aqua-wash focus-visible:ring-2 focus-visible:ring-aqua"
                    >
                      <PencilLine className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Remove ${p.name}`}
                      title="Remove"
                      className="grid size-7 place-items-center rounded-full bg-sheet/95 text-ink-soft shadow-sm outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-aqua"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-pretty text-ink-soft">
              {separate
                ? "Click a photo to edit it. Photos you haven't touched keep the shared design."
                : "Each photo is centred in the frame. Drop more photos anywhere on this panel."}
            </p>
          </PanelSection>

          <VariationsSection state={state} count={photos.length} noun="photo" value={variations} onChange={onVariations} />

          <PanelSection title="Export all">
            <div className="grid gap-4">
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[format]}
                onValueChange={(v) => v[0] && setFormat(v[0] as "jpeg" | "png")}
                className="w-full"
                aria-label="Format"
              >
                <ToggleGroupItem value="jpeg" className="flex-1">JPG</ToggleGroupItem>
                <ToggleGroupItem value="png" className="flex-1">PNG</ToggleGroupItem>
              </ToggleGroup>
              {format === "jpeg" && (
                <RangeField label="Quality" value={quality} min={60} max={100} format={(v) => `${v}%`} onChange={setQuality} />
              )}
              <p className="font-mono text-xs text-ink-soft tabular">
                {state.size === "original" ? "Each at its own size" : `${dims.w} × ${dims.h} px each`} · one ZIP file
              </p>
              {progress === null ? (
                <Button onClick={exportAll} className="h-9">
                  <Download /> Export {photos.length} post{photos.length === 1 ? "" : "s"}
                </Button>
              ) : (
                <div className="grid gap-2" role="status" aria-live="polite">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-ink">Exporting…</span>
                    <span className="font-mono text-xs text-ink-soft tabular">
                      {Math.round(progress * photos.length)} / {photos.length}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <Button variant="outline" onClick={() => (cancel.current = true)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </PanelSection>
        </>
      )}
    </DropArea>
  );
}

/* ------------------------------------------------------------------ reels */

export type BulkClip = {
  id: string;
  name: string;
  file: Blob;
  duration: number;
  width: number;
  height: number;
  poster: HTMLCanvasElement;
  /** Its own design, once edited on its own ("Edit each clip separately"). */
  design?: PostState;
};

/** The design a clip exports with: its own when edited separately, otherwise the shared one. */
export function bulkReelDesign(
  state: PostState,
  clip: BulkClip,
  separate: PostState | null,
  v: BulkVariations = NO_VARIATIONS,
  index = 0,
  tracks: LibraryTrack[] = [],
): PostState {
  if (!separate) return varyDesign(reelDesignFor(state, clip), clip.id, index, v, tracks);
  if (state.video?.id === clip.id) return state;
  return clip.design ?? varyDesign(reelDesignFor(separate, clip), clip.id, index, v, tracks);
}

/**
 * Bulk reels: design one reel, then apply the same look, text, stickers, music and
 * sound settings to many clips. Each is encoded frame by frame and all land in one ZIP.
 */
export function BulkReelPanel({
  state,
  assets,
  clips,
  separate,
  onSeparate,
  variations,
  onVariations,
  musicLibrary,
  onAdd,
  onFiles,
  onRemove,
  onOpen,
  onClear,
}: {
  state: PostState;
  assets: Assets;
  /** Tracks from /public/music, used by random music. */
  musicLibrary: LibraryTrack[];
  clips: BulkClip[];
  variations: BulkVariations;
  onVariations: (v: BulkVariations) => void;
  /** Each clip keeps its own edits; holds the shared design they start from. Null = one design for all. */
  separate: PostState | null;
  onSeparate: (on: boolean) => void;
  onAdd: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onOpen: (clip: BulkClip) => void;
  onClear: () => void;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ index: number; fraction: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const supported = canFastExport();

  // Live previews of each clip's poster frame with the current design.
  useEffect(() => {
    if (clips.length === 0) return;
    const timer = window.setTimeout(async () => {
      await ensureFonts(state);
      const next: Record<string, string> = {};
      for (const [i, c] of clips.entries()) {
        const design = bulkReelDesign(state, c, separate, variations, i);
        const dims = exportDims(design);
        const canvas = document.createElement("canvas");
        canvas.width = 220;
        canvas.height = Math.round((dims.h / dims.w) * 220);
        renderPost(canvas.getContext("2d")!, {
          source: c.poster,
          assets,
          state: design,
          width: 220,
          time: Math.min(1, c.duration / 2),
        });
        next[c.id] = canvas.toDataURL("image/jpeg", 0.75);
      }
      setThumbs(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, assets, clips, separate, variations]);

  const lengthOf = (c: BulkClip) => {
    const v = bulkReelDesign(state, c, separate).video;
    return v ? Math.max(0.1, reelLength(v)) : Math.min(c.duration, 90);
  };
  const editedCount = clips.filter((c) => c.design).length;
  const total = clips.reduce((sum, c) => sum + lengthOf(c), 0);

  const exportAll = async () => {
    await ensureExportFolder();
    abort.current = new AbortController();
    setProgress({ index: 0, fraction: 0 });
    try {
      const files: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const design = bulkReelDesign(state, c, separate, variations, i, musicLibrary);
        const { blob } = await fastExportReel({
          file: c.file,
          orientation: design.orientation,
          assets,
          state: design,
          signal: abort.current.signal,
          onProgress: (f) => setProgress({ index: i, fraction: f }),
        });
        let name = `${c.name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "reel"}-bubble`;
        for (let n = 2; used.has(name); n++) name = `${name}-${n}`;
        used.add(name);
        files[`${name}.mp4`] = new Uint8Array(await blob.arrayBuffer());
      }
      // Videos are already compressed; store them as-is.
      const zip = zipSync(files, { level: 0 });
      const blob = new Blob([zip as BlobPart], { type: "application/zip" });
      const filename = `bubble-studio-${clips.length}-reels.zip`;
      await saveExport(blob, filename, "reels");
      toast.success(`${clips.length} reels exported`, {
        description: `${filename} · ${(blob.size / 1048576).toFixed(1)} MB`,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") toast("Bulk export cancelled");
      else toast.error("Bulk export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  const done = progress
    ? clips.slice(0, progress.index).reduce((s, c) => s + lengthOf(c), 0) +
      (clips[progress.index] ? lengthOf(clips[progress.index]) : 0) * progress.fraction
    : 0;
  const percent = (done / Math.max(0.1, total)) * 100;

  return (
    <DropArea accept={(f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name)} label="videos" onFiles={onFiles}>
      <PanelSection title="Bulk reels">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Design one reel, then add more clips. Each gets the same filters, text, stickers, music and sound settings,
          and you download them all at once.
        </p>
        <label className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rule bg-tile/50 px-3 py-2.5">
          <span className="grid gap-0.5">
            <span className="text-[13px] font-medium text-ink">Edit each clip separately</span>
            <span className="text-xs text-pretty text-ink-soft">
              {separate
                ? editedCount
                  ? `${editedCount} of ${clips.length} edited on their own`
                  : "Click a clip to start editing it"
                : "Off: one design for every clip"}
            </span>
          </span>
          <Switch checked={!!separate} onCheckedChange={onSeparate} aria-label="Edit each clip separately" />
        </label>
        {!supported && (
          <p className="mb-3 rounded-md bg-yellow-wash px-3 py-2 text-xs text-pretty text-ink">
            Bulk reels need fast export, which this browser doesn&apos;t support. Use the desktop app or the latest
            Chrome or Edge.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onAdd}
           
            disabled={progress !== null || !supported}
          >
            <ImagePlus /> Add clips
          </Button>
          {clips.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-center text-destructive hover:text-destructive"
              onClick={onClear}
              disabled={progress !== null}
            >
              Clear all
            </Button>
          )}
        </div>
      </PanelSection>

      {clips.length === 0 ? (
        supported && <EmptyDrop onClick={onAdd} label="Drop videos here" hint="or click to choose several at once with Ctrl or Shift" />
      ) : (
        <>
          <PanelSection title={`${clips.length} clip${clips.length === 1 ? "" : "s"}`}>
            <ul className="grid grid-cols-2 gap-2">
              {clips.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(c)}
                    aria-label={separate ? `Edit ${c.name}` : `Open ${c.name} in the editor`}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-lg bg-black ring-1 ring-rule outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                      state.video?.id === c.id && "ring-2 ring-aqua",
                    )}
                  >
                    {thumbs[c.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[c.id]} alt={`Preview of ${c.name}`} className="block w-full" />
                    ) : (
                      <div className="aspect-[9/16] animate-pulse bg-muted" />
                    )}
                    {separate && (state.video?.id === c.id || c.design) && (
                      <span
                        className={cn(
                          "absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          state.video?.id === c.id ? "bg-aqua text-white" : "bg-sheet/90 text-ink",
                        )}
                      >
                        {state.video?.id === c.id ? "Editing" : "Edited"}
                      </span>
                    )}
                  </button>
                  <p className="mt-1 flex justify-between gap-2 text-[11px] text-ink-soft">
                    <span className="truncate" title={c.name}>
                      {c.name}
                    </span>
                    <span className="shrink-0 font-mono tabular">{formatTime(lengthOf(c))}</span>
                  </p>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      aria-label={`Edit ${c.name} in the editor`}
                      title="Open in the editor"
                      className="grid size-7 place-items-center rounded-full bg-sheet/95 text-ink shadow-sm outline-none hover:bg-aqua-wash focus-visible:ring-2 focus-visible:ring-aqua"
                    >
                      <PencilLine className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      aria-label={`Remove ${c.name}`}
                      title="Remove"
                      className="grid size-7 place-items-center rounded-full bg-sheet/95 text-ink-soft shadow-sm outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-aqua"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-pretty text-ink-soft">
              {separate
                ? "Click a clip to edit it, including its trim and music. Clips you haven't touched keep the shared design."
                : "Each clip uses its own length (up to 90 seconds) and the music is fitted to it."}
            </p>
          </PanelSection>

          <VariationsSection state={state} count={clips.length} noun="clip" value={variations} onChange={onVariations}>
            <label className="flex items-start justify-between gap-3">
              <span className="grid gap-0.5">
                <span className="text-[13px] font-medium text-ink">Random music</span>
                <span className="text-xs text-pretty text-ink-soft">
                  {musicLibrary.length
                    ? `A different track from the music library on each clip (${musicLibrary.length} tracks).`
                    : "Add MP3 files to the music library to use this."}
                </span>
              </span>
              <Switch
                checked={variations.randomMusic}
                disabled={!musicLibrary.length}
                onCheckedChange={(randomMusic) => onVariations({ ...variations, randomMusic })}
                aria-label="Random music"
              />
            </label>
            {variations.randomMusic && (
              <RangeField
                label="Music volume"
                value={variations.musicVolume}
                min={5}
                max={100}
                format={(v) => `${v}%`}
                onChange={(musicVolume) => onVariations({ ...variations, musicVolume })}
              />
            )}
          </VariationsSection>

          <PanelSection title="Export all">
            <p className="mb-3 font-mono text-xs text-ink-soft tabular">
              {state.size === "original" ? "Each at its own size" : "1080 × 1920 each"} · {formatTime(total)} of video ·
              one ZIP
            </p>
            {progress === null ? (
              <Button
                onClick={exportAll}
                disabled={!supported}
                className="h-9 w-full"
              >
                <Download /> Export {clips.length} reel{clips.length === 1 ? "" : "s"}
              </Button>
            ) : (
              <div className="grid gap-2" role="status" aria-live="polite">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-ink">
                    Reel {progress.index + 1} of {clips.length}
                  </span>
                  <span className="font-mono text-xs text-ink-soft tabular">{Math.round(percent)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${percent}%` }} />
                </div>
                <Button variant="outline" onClick={() => abort.current?.abort()}>
                  Cancel
                </Button>
              </div>
            )}
          </PanelSection>
        </>
      )}
    </DropArea>
  );
}
