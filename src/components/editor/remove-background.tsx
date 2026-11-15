"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { BgModel } from "@/lib/editor/bg-remove";
import { useIsDesktop } from "./desktop-updates";

/* Which background model to use: "quick" (built in) or "best" (IS-Net, downloaded once). */
const KEY = "bubble-studio:bg-model";
const listeners = new Set<() => void>();
export function getBgModel(): BgModel {
  try {
    return localStorage.getItem(KEY) === "best" ? "best" : "quick";
  } catch {
    return "quick";
  }
}
function setBgModel(m: BgModel) {
  try {
    localStorage.setItem(KEY, m);
  } catch {}
  listeners.forEach((l) => l());
}
const useBgModel = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getBgModel,
    () => "quick" as BgModel,
  );

const mb = (n: number) => `${Math.round(n / 1048576)} MB`;

type Pack = "quick" | "isnet";
type Status = { ready: boolean; size: number };

async function readStatus(): Promise<Record<Pack, Status> | null> {
  const bridge = window.bubbleDesktop;
  if (!bridge?.modelStatus) return null;
  const [quick, isnet] = await Promise.all([bridge.modelStatus("quick"), bridge.modelStatus("isnet")]);
  // The file was removed (e.g. Reset): fall back to the built-in model.
  if (!isnet.ready && getBgModel() === "best") setBgModel("quick");
  return { quick, isnet };
}

export function RemoveBackground({ onRemove, removing }: { onRemove: () => void; removing: boolean }) {
  const desktop = useIsDesktop();
  const model = useBgModel();
  // What each model still needs to download (the runtime is shared, so it counts for both until fetched).
  const [status, setStatus] = useState<Record<Pack, Status> | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const refresh = () => readStatus().then(setStatus);
  useEffect(() => {
    void readStatus().then(setStatus);
    return window.bubbleDesktop?.onModelProgress?.((p) => setProgress(p.received / p.total));
  }, []);

  if (!desktop) {
    return <div className="grid gap-2 text-sm"><span>Remove background <span className="text-xs text-ink-soft">Desktop app</span></span><a className="underline" href="https://github.com/harindujayakody/bubble-studio/releases/latest" target="_blank" rel="noreferrer">Download the desktop app</a></div>;
  }

  /** Download a model (and the runtime) if it isn't here yet. True when it's ready. */
  const ensure = async (pack: Pack) => {
    const bridge = window.bubbleDesktop;
    if (status?.[pack].ready) return true;
    if (!bridge?.downloadModel) {
      toast.error("Update the desktop app to remove backgrounds.");
      return false;
    }
    setTotal(status?.[pack].size ?? 0);
    setProgress(0);
    const res = await bridge.downloadModel(pack);
    setProgress(null);
    await refresh();
    if ("ok" in res) return true;
    if (res.error !== "cancelled") toast.error("Couldn't download the background remover", { description: res.error });
    return false;
  };

  const remove = async () => {
    if (await ensure(model === "best" ? "isnet" : "quick")) onRemove();
  };

  const choose = async (best: boolean) => {
    if (!best) return setBgModel("quick");
    if (!(await ensure("isnet"))) return;
    setBgModel("best");
    if (!status?.isnet.ready) toast.success("Best edges is ready", { description: "It works offline from now on." });
  };

  const need = status && !status[model === "best" ? "isnet" : "quick"].ready ? status[model === "best" ? "isnet" : "quick"].size : 0;
  const bestSize = status?.isnet.ready ? 0 : (status?.isnet.size ?? 0);

  return (
    <div className="grid gap-2.5">
      <Button onClick={() => void remove()} disabled={removing || progress !== null || !status}>
        <Wand2 className={cn(removing && "animate-pulse")} />
        {removing ? "Removing background…" : "Remove background"}
      </Button>
      {progress === null ? (
        <>
          {need > 0 && <p className="-mt-1 text-xs text-pretty text-ink-soft">The first time, this downloads the background remover ({mb(need)}). After that it works offline.</p>}
          <label className="flex items-start justify-between gap-3 text-[13px] text-ink">
            <span className="grid gap-0.5">
              <span className="font-medium">Best edges</span>
              <span className="text-xs text-pretty text-ink-soft">
                {bestSize ? `Cleaner hair and edges. Downloads ${mb(bestSize)} once, then works offline.` : "Cleaner hair and edges, a little slower."}
              </span>
            </span>
            <Switch checked={model === "best"} onCheckedChange={(v) => void choose(v)} aria-label="Best edges" disabled={removing || !status} />
          </label>
        </>
      ) : (
        <div className="grid gap-1.5" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-ink">Downloading the background remover…</span>
            <span className="font-mono text-xs text-ink-soft tabular">
              {mb(progress * total)} / {mb(total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-tile" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => void window.bubbleDesktop?.cancelModelDownload?.()}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
