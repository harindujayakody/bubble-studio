"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Images, PencilLine, X } from "lucide-react";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PanelSection, RangeField } from "./controls";
import { ensureFonts, exportDims, fitExport, orientImage, renderPost, type Assets } from "@/lib/editor/render";
import type { PostState } from "@/lib/editor/types";

export type BulkPhoto = { id: string; name: string; img: HTMLImageElement; file: Blob };

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

function render(state: PostState, photo: BulkPhoto, assets: Assets, width?: number) {
  const design = designFor(state, photo);
  const source = orientImage(photo.img, design.orientation);
  const dims = exportDims(design);
  const w = width ?? dims.w;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = Math.round((dims.h / dims.w) * w);
  renderPost(canvas.getContext("2d")!, { source, assets, state: design, width: w });
  return canvas;
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
  onAdd,
  onRemove,
  onOpen,
  onClear,
}: {
  state: PostState;
  assets: Assets;
  photos: BulkPhoto[];
  onAdd: () => void;
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
      for (const p of photos) next[p.id] = render(state, p, assets, 220).toDataURL("image/jpeg", 0.75);
      setThumbs(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, assets, photos]);

  const exportAll = async () => {
    cancel.current = false;
    setProgress(0);
    try {
      await ensureFonts(state);
      const files: Record<string, Uint8Array> = {};
      const ext = format === "jpeg" ? "jpg" : "png";
      const used = new Set<string>();
      for (let i = 0; i < photos.length; i++) {
        if (cancel.current) throw new DOMException("Cancelled", "AbortError");
        const p = photos[i];
        const blob = await toBlob(render(state, p, assets), `image/${format}`, format === "jpeg" ? quality / 100 : undefined);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bubble-studio-${photos.length}-posts.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success(`${photos.length} posts exported`, { description: `${a.download} · ${(blob.size / 1048576).toFixed(1)} MB` });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") toast("Bulk export cancelled");
      else toast.error("Bulk export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setProgress(null);
    }
  };

  const dims = exportDims(state);

  return (
    <>
      <PanelSection title="Bulk edit">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Design one post, then add more photos. Each gets the same filters, adjustments, text, stickers and size, and
          you download them all at once.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAdd} className="bg-brand text-white hover:bg-brand-ink" disabled={progress !== null}>
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
        <div className="grid place-items-center px-6 py-10 text-center">
          <Images className="mb-3 size-8 text-ink-soft/60" />
          <p className="text-sm text-pretty text-ink-soft">
            No photos yet. Pick several at once with Ctrl or Shift in the file window.
          </p>
        </div>
      ) : (
        <>
          <PanelSection title={`${photos.length} photo${photos.length === 1 ? "" : "s"}`}>
            <ul className="grid grid-cols-2 gap-2">
              {photos.map((p) => (
                <li key={p.id} className="group relative">
                  <div className={cn("checker overflow-hidden rounded-md ring-1 ring-rule", state.photoId === p.id && "ring-2 ring-aqua")}>
                    {thumbs[p.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[p.id]} alt={`Preview of ${p.name}`} className="block w-full" />
                    ) : (
                      <div className="aspect-square animate-pulse bg-muted" />
                    )}
                  </div>
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
              Each photo is centred in the frame. Use the pencil to open one in the editor and fine-tune it.
            </p>
          </PanelSection>

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
                <Button onClick={exportAll} className="h-9 bg-brand text-white hover:bg-brand-ink">
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
    </>
  );
}
