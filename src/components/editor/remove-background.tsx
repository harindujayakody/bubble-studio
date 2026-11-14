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

export function RemoveBackground({ onRemove, removing }: { onRemove: () => void; removing: boolean }) {
  const desktop = useIsDesktop();
  const model = useBgModel();
  const [ready, setReady] = useState<boolean | null>(null);
  const [size, setSize] = useState(178648008);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const bridge = window.bubbleDesktop;
    if (!bridge?.modelStatus) return;
    void bridge.modelStatus("isnet").then((s) => {
      setReady(s.ready);
      setSize(s.size || 178648008);
      // The file was removed (e.g. Reset): fall back to the built-in model.
      if (!s.ready && getBgModel() === "best") setBgModel("quick");
    });
    return bridge.onModelProgress?.((p) => p.name === "isnet" && setProgress(p.received / p.total));
  }, []);

  if (!desktop) {
    return <div className="grid gap-2 text-sm"><span>Remove background <span className="text-xs text-ink-soft">Desktop app</span></span><a className="underline" href="https://github.com/harindujayakody/bubble-studio/releases/latest" target="_blank" rel="noreferrer">Download the desktop app</a></div>;
  }

  const choose = async (best: boolean) => {
    const bridge = window.bubbleDesktop;
    if (!best || ready) return setBgModel(best ? "best" : "quick");
    if (!bridge?.downloadModel) return toast.error("Update the desktop app to use Best edges.");
    setProgress(0);
    const res = await bridge.downloadModel("isnet");
    setProgress(null);
    if ("ok" in res) {
      setReady(true);
      setBgModel("best");
      toast.success("Best edges is ready", { description: "It works offline from now on." });
    } else if (res.error !== "cancelled") {
      toast.error("Couldn't download the better model", { description: res.error });
    }
  };

  return (
    <div className="grid gap-2.5">
      <Button onClick={onRemove} disabled={removing || progress !== null}>
        <Wand2 className={cn(removing && "animate-pulse")} />
        {removing ? "Removing background…" : "Remove background"}
      </Button>
      {progress === null ? (
        <label className="flex items-start justify-between gap-3 text-[13px] text-ink">
          <span className="grid gap-0.5">
            <span className="font-medium">Best edges</span>
            <span className="text-xs text-pretty text-ink-soft">
              {ready ? "Cleaner hair and edges, a little slower." : `Cleaner hair and edges. Downloads ${mb(size)} once, then works offline.`}
            </span>
          </span>
          <Switch checked={model === "best"} onCheckedChange={(v) => void choose(v)} aria-label="Best edges" disabled={removing} />
        </label>
      ) : (
        <div className="grid gap-1.5" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-ink">Downloading the better model…</span>
            <span className="font-mono text-xs text-ink-soft tabular">
              {mb(progress * size)} / {mb(size)}
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
