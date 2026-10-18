"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type UpdateStatus =
  | { state: "checking" | "dev" }
  | { state: "available" | "none" | "ready"; version?: string }
  | { state: "downloading"; percent: number }
  | { state: "error"; message: string };

type DesktopBridge = {
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdate: (cb: (s: UpdateStatus) => void) => () => void;
};

declare global {
  interface Window {
    bubbleDesktop?: DesktopBridge;
  }
}

const noop = () => () => {};
/** True only inside the desktop app (the preload script adds the bridge). */
function useIsDesktop() {
  return useSyncExternalStore(noop, () => !!window.bubbleDesktop, () => false);
}

/**
 * Desktop-only: version, "Check for updates", and toasts as an update downloads.
 * Updates install on restart; the user can restart straight away from the toast.
 */
export function DesktopUpdates() {
  const desktop = useIsDesktop();
  const [version, setVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  /** Only say "you're up to date" or show errors when the user asked. */
  const manual = useRef(false);

  useEffect(() => {
    const bridge = window.bubbleDesktop;
    if (!bridge) return;
    void bridge.getVersion().then(setVersion);
    return bridge.onUpdate((s) => {
      setStatus(s);
      if (s.state === "available") {
        toast(`Downloading Bubble Studio ${s.version ?? "update"}`, { description: "You can keep working." });
      } else if (s.state === "ready") {
        manual.current = false;
        toast.success(`Bubble Studio ${s.version ?? ""} is ready`, {
          description: "Restart to finish updating. Your auto-saved post will be waiting.",
          duration: Infinity,
          action: { label: "Restart now", onClick: () => void bridge.installUpdate() },
        });
      } else if (s.state === "none" && manual.current) {
        manual.current = false;
        toast("You're up to date", { description: `Version ${s.version ?? ""}` });
      } else if (s.state === "error" && manual.current) {
        manual.current = false;
        toast.error("Couldn't check for updates", { description: "Check your internet connection and try again." });
      } else if (s.state === "dev" && manual.current) {
        manual.current = false;
        toast("Updates are off in development builds");
      }
    });
  }, []);

  if (!desktop) return null;

  const busy = status?.state === "checking" || status?.state === "downloading";
  const label =
    status?.state === "downloading"
      ? `Downloading ${status.percent}%`
      : status?.state === "ready"
        ? "Restart to update"
        : status?.state === "checking"
          ? "Checking…"
          : "Check for updates";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-1.5 px-2 text-ink-soft" aria-label="App version and updates" />}
      >
        {status?.state === "ready" ? <Download className="text-brand" /> : <RefreshCw className={busy ? "animate-spin" : ""} />}
        <span className="hidden font-mono text-[11px] tabular xl:inline">v{version ?? "…"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-ink">Bubble Studio</p>
          <p className="font-mono text-[11px] text-ink-soft tabular">Version {version ?? "…"}</p>
        </div>
        <DropdownMenuItem
          disabled={busy}
          onClick={() => {
            const bridge = window.bubbleDesktop;
            if (!bridge) return;
            if (status?.state === "ready") {
              void bridge.installUpdate();
              return;
            }
            manual.current = true;
            void bridge.checkForUpdates();
          }}
          className="gap-2"
        >
          {status?.state === "ready" ? <Download className="text-brand" /> : <RefreshCw />}
          {label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
