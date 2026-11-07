"use client";

import { useEffect, useState } from "react";
import { Download, Wand2 } from "lucide-react";
import { zipSync } from "fflate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ensureFonts, exportDims, exportPost, postDims, renderPost, type Assets, type Source } from "@/lib/editor/render";
import { resizeDesign } from "@/lib/editor/resize";
import { ensureExportFolder, saveExport } from "@/lib/editor/save";
import { POST_SIZES, type PostSizeId, type PostState } from "@/lib/editor/types";

const SIZES: PostSizeId[] = ["square", "feed", "portrait", "story", "landscape"];

/** Magic resize: the current design at several sizes at once, to open one or export them all. */
export function MagicResizeDialog({
  open,
  onOpenChange,
  state,
  source,
  assets,
  onOpenDesign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PostState;
  source: Source | null;
  assets: Assets;
  onOpenDesign: (state: PostState) => void;
}) {
  const [picked, setPicked] = useState<PostSizeId[]>(() => SIZES.filter((s) => s !== state.size).slice(0, 3));
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const designs = picked.map((size) => ({ size, state: resizeDesign(state, size) }));

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const id = window.setTimeout(async () => {
      const next: Record<string, string> = {};
      for (const size of SIZES) {
        const d = resizeDesign(state, size);
        await ensureFonts(d);
        const c = document.createElement("canvas");
        c.width = 260;
        c.height = Math.round(260 / postDims(d).aspect);
        renderPost(c.getContext("2d")!, { source, assets, state: d, width: 260 });
        next[size] = c.toDataURL("image/jpeg", 0.8);
      }
      if (alive) setThumbs(next);
    }, 50);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [open, state, source, assets]);

  const exportAll = async () => {
    await ensureExportFolder();
    setBusy(true);
    try {
      const files: Record<string, Uint8Array> = {};
      for (const d of designs) {
        const blob = await exportPost(source, assets, d.state, "jpeg", 92);
        const { w, h } = exportDims(d.state);
        files[`bubble-${d.size}-${w}x${h}.jpg`] = new Uint8Array(await blob.arrayBuffer());
      }
      const zip = new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
      await saveExport(zip, `bubble-resize-${designs.length}-sizes-${Math.random().toString(36).slice(2, 6)}.zip`, "photos");
      toast.success(`${designs.length} sizes exported`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5 text-brand" /> Magic resize
          </DialogTitle>
          <DialogDescription>
            Pick the sizes you need. Text and stickers are refitted to each shape; open one to fine-tune it, or export them all.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto p-1 sm:grid-cols-3">
          {SIZES.map((size) => {
            const on = picked.includes(size);
            const s = POST_SIZES[size];
            return (
              <li key={size} className="grid content-start gap-2">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== size) : [...p, size]))}
                  className={cn(
                    "relative grid place-items-center overflow-hidden rounded-xl bg-tile p-2 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-aqua",
                    on ? "ring-2 ring-brand" : "opacity-60 hover:opacity-100",
                  )}
                  style={{ aspectRatio: 1 }}
                >
                  {thumbs[size] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[size]} alt="" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-contain drop-shadow-md" />
                  ) : (
                    <span className="size-full animate-pulse rounded-md bg-sheet" />
                  )}
                </button>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {s.label} {size === state.size && <span className="text-ink-soft">(current)</span>}
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft tabular">
                      {s.ratio} · {s.w} × {s.h}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenDesign(resizeDesign(state, size));
                      onOpenChange(false);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <span className="text-[13px] text-ink-soft">{picked.length} selected · one ZIP of JPGs</span>
          <Button onClick={() => void exportAll()} disabled={busy || picked.length === 0}>
            <Download /> {busy ? "Exporting…" : `Export ${picked.length} size${picked.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
