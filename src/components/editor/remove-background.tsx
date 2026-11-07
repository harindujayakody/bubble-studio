"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "./desktop-updates";

export function RemoveBackground({ onRemove, removing }: { onRemove: () => void; removing: boolean }) {
  const desktop = useIsDesktop();
  if (!desktop) {
    return <div className="grid gap-2 text-sm"><span>Remove background <span className="text-xs text-ink-soft">Desktop app</span></span><a className="underline" href="https://github.com/harindujayakody/bubble-studio/releases/latest" target="_blank" rel="noreferrer">Download the desktop app</a></div>;
  }
  return <Button onClick={onRemove} disabled={removing}><Wand2 className={cn(removing && "animate-pulse")} />{removing ? "Removing background…" : "Remove background"}</Button>;
}
