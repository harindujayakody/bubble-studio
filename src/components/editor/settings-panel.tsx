"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FolderOpen, HardDrive, LoaderCircle, RefreshCw, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelSection } from "./controls";
import { deleteDraft, setAutosave } from "@/lib/editor/draft";
import { clearPhrases } from "@/lib/editor/phrases";
import { checkForUpdatesNow, useIsDesktop, useUpdateStatus, type DesktopSettings } from "./desktop-updates";

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

/** Settings, opened from the left rail: updates and downloads (desktop app), storage, version. */
export function SettingsPanel() {
  const desktop = useIsDesktop();
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  const refreshUsage = async () => {
    try {
      const est = await navigator.storage?.estimate?.();
      setUsage(est ? { used: est.usage ?? 0, quota: est.quota ?? 0 } : null);
    } catch {
      setUsage(null);
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const bridge = window.bubbleDesktop;
      const [s, v] = await Promise.all([bridge?.getSettings(), bridge?.getVersion()]);
      if (!alive) return;
      setSettings(s ?? null);
      setVersion(v ?? null);
      await refreshUsage();
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {desktop && <UpdatesSection version={version} />}
      {desktop && <DownloadsSection settings={settings} onChange={setSettings} />}
      <StorageSection usage={usage} desktop={desktop} onCleared={refreshUsage} />
      <PanelSection title="About">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={44} height={44} className="size-11 rounded-[11px]" />
          <div>
            <p className="font-heading text-[15px] font-semibold text-ink">Bubble Studio</p>
            <p className="font-mono text-xs text-ink-soft tabular">
              {version
                ? `Version ${version}`
                : desktop
                  ? "Version …"
                  : `Version ${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"} · Web`}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-pretty text-ink-soft">
          Everything you make stays on this {desktop ? "computer" : "device"}. Nothing is uploaded.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <GithubMark className="size-4" />
            Source on GitHub
          </Button>
          <span className="text-xs text-ink-soft">MIT License</span>
        </div>
      </PanelSection>
    </>
  );
}

function UpdatesSection({ version }: { version: string | null }) {
  const status = useUpdateStatus();
  const bridge = typeof window === "undefined" ? undefined : window.bubbleDesktop;
  const busy = status.state === "checking" || status.state === "downloading";

  const view = (() => {
    switch (status.state) {
      case "checking":
        return { icon: <LoaderCircle className="animate-spin text-aqua-ink" />, title: "Checking for updates…", detail: null };
      case "downloading":
        return { icon: <LoaderCircle className="animate-spin text-aqua-ink" />, title: `Downloading update · ${status.percent}%`, detail: "You can keep working." };
      case "available":
        return { icon: <Download className="text-aqua-ink" />, title: `Version ${status.version ?? ""} found`, detail: "Downloading in the background." };
      case "ready":
        return { icon: <CheckCircle2 className="text-brand" />, title: `Version ${status.version ?? ""} is ready`, detail: "Restart to finish updating." };
      case "manual":
        return { icon: <Download className="text-brand" />, title: `Version ${status.version ?? ""} is available`, detail: "Download it and drag it into Applications." };
      case "none":
        return { icon: <CheckCircle2 className="text-aqua-ink" />, title: "You're up to date", detail: null };
      case "error":
        return { icon: <TriangleAlert className="text-destructive" />, title: "Couldn't check for updates", detail: "Check your internet connection and try again." };
      case "dev":
        return { icon: <TriangleAlert className="text-ink-soft" />, title: "Updates are off in development builds", detail: null };
      default:
        return { icon: <RefreshCw className="text-ink-soft" />, title: "Updates install automatically", detail: "Checked at launch and every four hours." };
    }
  })();

  return (
    <PanelSection title="Updates">
      <div className="flex items-start gap-3 rounded-lg border border-rule p-3">
        <span className="mt-0.5 [&_svg]:size-5">{view.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{view.title}</p>
          {view.detail && <p className="mt-0.5 text-[13px] text-pretty text-ink-soft">{view.detail}</p>}
          <p className="mt-1 font-mono text-[11px] text-ink-soft tabular">Installed: {version ?? "…"}</p>
          {status.state === "downloading" && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-aqua transition-[width] duration-200" style={{ width: `${status.percent}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        {status.state === "ready" ? (
          <Button className="w-full bg-brand text-white hover:bg-brand-ink" onClick={() => void bridge?.installUpdate()}>
            <RotateCcw /> Restart and update
          </Button>
        ) : status.state === "manual" ? (
          <Button className="w-full bg-brand text-white hover:bg-brand-ink" onClick={() => void bridge?.openDownload()}>
            <Download /> Download update
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled={busy} onClick={checkForUpdatesNow}>
            <RefreshCw className={cn(busy && "animate-spin")} /> Check for updates
          </Button>
        )}
      </div>
    </PanelSection>
  );
}

function DownloadsSection({
  settings,
  onChange,
}: {
  settings: DesktopSettings | null;
  onChange: (s: DesktopSettings) => void;
}) {
  const bridge = typeof window === "undefined" ? undefined : window.bubbleDesktop;
  if (!bridge) return null;
  const dir = settings?.downloadDir ?? null;
  return (
    <PanelSection title="Downloads">
      <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
        {dir
          ? "Exports save straight to this folder. Existing files are never overwritten; a number is added."
          : "You choose where each export goes when you save it."}
      </p>
      <div className="flex items-center gap-2.5 rounded-lg border border-rule bg-muted/40 px-3 py-2.5">
        <FolderOpen className="size-4 shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink" title={dir ?? ""}>
          {dir ?? "Ask every time"}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <Button className="bg-brand text-white hover:bg-brand-ink" onClick={async () => onChange(await bridge.chooseDownloadDir())}>
          {dir ? "Change folder…" : "Choose a folder…"}
        </Button>
        {dir && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void bridge.openDownloadDir()}>
              Open folder
            </Button>
            <Button variant="ghost" onClick={async () => onChange(await bridge.clearDownloadDir())}>
              Ask every time
            </Button>
          </div>
        )}
      </div>
    </PanelSection>
  );
}

function StorageSection({
  usage,
  desktop,
  onCleared,
}: {
  usage: { used: number; quota: number } | null;
  desktop: boolean;
  onCleared: () => Promise<void>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const bridge = typeof window === "undefined" ? undefined : window.bubbleDesktop;
  const share = usage && usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;

  const resetAll = async () => {
    setConfirmReset(false);
    if (bridge) {
      await bridge.resetAll(); // clears storage and reloads the window
      return;
    }
    await deleteDraft();
    clearPhrases();
    setAutosave(false);
    try {
      window.localStorage.clear();
    } catch {
      // Storage blocked: nothing to clear.
    }
    window.location.reload();
  };

  return (
    <PanelSection title="Storage">
      <div className="mb-4 rounded-lg border border-rule p-3">
        <div className="flex items-center gap-2 text-sm text-ink">
          <HardDrive className="size-4 text-ink-soft" />
          {usage ? `${formatSize(usage.used)} used` : "Checking…"}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-aqua" style={{ width: `${Math.max(share, usage?.used ? 1 : 0)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">Saved posts, phrases and settings on this {desktop ? "computer" : "device"}.</p>
      </div>

      <ul className="grid gap-2">
        <ClearRow
          label="Auto-saved post"
          detail="The last post kept for Continue, including its photos and videos."
          onClear={async () => {
            await deleteDraft();
            await onCleared();
            toast("Saved post cleared");
          }}
        />
        <ClearRow
          label="Saved phrases"
          detail="Phrases you imported into the Text panel."
          onClear={async () => {
            clearPhrases();
            await onCleared();
            toast("Saved phrases cleared");
          }}
        />
        {desktop && bridge && (
          <ClearRow
            label="App cache"
            detail="Temporary files and update installers that were already downloaded."
            onClear={async () => {
              const { updates } = await bridge.clearCache();
              await onCleared();
              toast("Cache cleared", { description: updates ? `Freed ${formatSize(updates)} of downloaded updates.` : undefined });
            }}
          />
        )}
      </ul>

      <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-3">
        <p className="text-sm font-medium text-ink">Reset everything</p>
        <p className="mt-0.5 text-[13px] text-pretty text-ink-soft">
          Removes your saved post, phrases and all settings{desktop ? ", including the download folder" : ""}. Your exported
          files are not touched.
        </p>
        {confirmReset ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => void resetAll()}>
              Yes, reset
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="destructive" className="mt-3 w-full" onClick={() => setConfirmReset(true)}>
            Reset everything…
          </Button>
        )}
      </div>
    </PanelSection>
  );
}

function ClearRow({ label, detail, onClear }: { label: string; detail: string; onClear: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-rule p-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[13px] text-pretty text-ink-soft">{detail}</span>
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onClear();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Trash2 /> Clear
      </Button>
    </li>
  );
}

const REPO_URL = "https://github.com/harindujayakody/bubble-studio";

/** GitHub's mark (lucide has no brand icons). */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
