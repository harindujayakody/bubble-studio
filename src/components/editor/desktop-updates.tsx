"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type UpdateStatus =
  | { state: "checking" | "dev" }
  | { state: "available" | "none" | "ready" | "manual"; version?: string }
  | { state: "downloading"; percent: number }
  | { state: "error"; message: string };

export type DesktopSettings = { downloadDir: string | null; platform: string };
type SavedFile = { path: string; name: string; folder: string };

export type DesktopBridge = {
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  /** macOS: open the release page, since unsigned Mac apps can't install updates themselves. */
  openDownload: () => Promise<void>;
  onUpdate: (cb: (s: UpdateStatus) => void) => () => void;
  getSettings: () => Promise<DesktopSettings>;
  chooseDownloadDir: () => Promise<DesktopSettings>;
  clearDownloadDir: () => Promise<DesktopSettings>;
  openDownloadDir: () => Promise<void>;
  showInFolder: (file: string) => Promise<void>;
  onDownloadDone: (cb: (f: SavedFile) => void) => () => void;
  clearCache: () => Promise<{ updates: number }>;
  resetAll: () => Promise<void>;
};

declare global {
  interface Window {
    bubbleDesktop?: DesktopBridge;
  }
}

const noop = () => () => {};
/** True only inside the desktop app (the preload script adds the bridge). */
export function useIsDesktop() {
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
    // Every finished export: say where it went and offer to reveal it.
    const offSaved = bridge.onDownloadDone((f) => {
      toast.success(`Saved ${f.name}`, {
        description: f.folder,
        action: { label: "Show in folder", onClick: () => void bridge.showInFolder(f.path) },
      });
    });
    const offUpdate = bridge.onUpdate((s) => {
      setStatus(s);
      if (s.state === "available") {
        toast(`Downloading Bubble Studio ${s.version ?? "update"}`, { description: "You can keep working." });
      } else if (s.state === "manual") {
        manual.current = false;
        toast(`Bubble Studio ${s.version ?? ""} is available`, {
          description: "Download the new version and drag it into Applications.",
          duration: Infinity,
          action: { label: "Download", onClick: () => void bridge.openDownload() },
        });
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
    return () => {
      offSaved();
      offUpdate();
    };
  }, []);

  if (!desktop) return null;

  const busy = status?.state === "checking" || status?.state === "downloading";
  const label =
    status?.state === "downloading"
      ? `Downloading ${status.percent}%`
      : status?.state === "ready"
        ? "Restart to update"
        : status?.state === "manual"
          ? `Download ${status.version ?? "update"}`
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
            if (status?.state === "manual") {
              void bridge.openDownload();
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
