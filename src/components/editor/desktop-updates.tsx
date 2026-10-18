"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

export type UpdateStatus =
  | { state: "idle" | "checking" | "dev" }
  | { state: "available" | "none" | "ready" | "manual"; version?: string }
  | { state: "downloading"; percent: number }
  | { state: "error"; message: string };

export type DesktopSettings = { downloadDir: string | null; platform: string };
type SavedFile = { path: string; name: string; folder: string };

export type DesktopBridge = {
  getVersion: () => Promise<string>;
  /** Match the window frame and startup colour to the app theme. Missing on builds before 1.0. */
  setTheme?: (pref: "system" | "light" | "dark") => Promise<void>;
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
  /** Which subfolder of the master folder the next download goes to. Missing before 1.1. */
  setDownloadKind?: (kind: "photos" | "reels" | "audios" | "merged") => Promise<void>;
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

/* The latest update status, shared by the background listener and the Settings panel. */
let current: UpdateStatus = { state: "idle" };
/** Set when the user pressed "Check for updates", so "up to date" and errors are reported. */
let manualCheck = false;
const listeners = new Set<() => void>();
function setStatus(s: UpdateStatus) {
  current = s;
  listeners.forEach((l) => l());
}

export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}

export function checkForUpdatesNow() {
  manualCheck = true;
  void window.bubbleDesktop?.checkForUpdates();
}

/**
 * Desktop only, renders nothing: follows update progress and finished exports for the
 * whole session and announces them with toasts. Mounted once at the editor root.
 */
export function DesktopUpdateListener() {
  useEffect(() => {
    const bridge = window.bubbleDesktop;
    if (!bridge) return;

    const offSaved = bridge.onDownloadDone((f) => {
      toast.success(`Saved ${f.name}`, {
        description: f.folder,
        action: { label: "Show in folder", onClick: () => void bridge.showInFolder(f.path) },
      });
    });

    const offUpdate = bridge.onUpdate((s) => {
      setStatus(s);
      const wasManual = manualCheck;
      if (s.state !== "checking" && s.state !== "downloading") manualCheck = false;
      if (s.state === "available") {
        toast(`Downloading Bubble Studio ${s.version ?? "update"}`, { description: "You can keep working." });
      } else if (s.state === "manual") {
        toast(`Bubble Studio ${s.version ?? ""} is available`, {
          description: "Download the new version and drag it into Applications.",
          duration: Infinity,
          action: { label: "Download", onClick: () => void bridge.openDownload() },
        });
      } else if (s.state === "ready") {
        toast.success(`Bubble Studio ${s.version ?? ""} is ready`, {
          description: "Restart to finish updating. Your auto-saved post will be waiting.",
          duration: Infinity,
          action: { label: "Restart now", onClick: () => void bridge.installUpdate() },
        });
      } else if (s.state === "none" && wasManual) {
        toast("You're up to date", { description: s.version ? `Version ${s.version}` : undefined });
      } else if (s.state === "error" && wasManual) {
        toast.error("Couldn't check for updates", { description: "Check your internet connection and try again." });
      } else if (s.state === "dev" && wasManual) {
        toast("Updates are off in development builds");
      }
    });

    return () => {
      offSaved();
      offUpdate();
    };
  }, []);

  return null;
}
