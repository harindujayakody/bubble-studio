"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Folder, FolderOpen, HardDrive, LoaderCircle, Monitor, Moon, RefreshCw, RotateCcw, Sun, Trash2, TriangleAlert } from "lucide-react";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";
import { canPickFolder, chooseWebFolder, clearWebFolder, EXPORT_FOLDERS, useWebFolder } from "@/lib/editor/save";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelSection } from "./controls";
import { GithubMark, REPO_URL } from "./start-screen";
import { deleteDraft, setAutosave } from "@/lib/editor/draft";
import { clearPhrases } from "@/lib/editor/phrases";
import { checkForUpdatesNow, useIsDesktop, useLatestVersion, useUpdateStatus, type DesktopSettings } from "./desktop-updates";

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
      <AppearanceSection />
      {desktop && <UpdatesSection version={version} />}
      <DownloadsSection settings={settings} onChange={setSettings} />
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

const THEMES: { value: ThemePref; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function AppearanceSection() {
  const pref = useThemePref();
  return (
    <PanelSection title="Appearance">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
        {THEMES.map(({ value, label, icon: Icon }) => {
          const on = pref === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setThemePref(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                on ? "border-brand bg-brand-wash text-ink" : "border-rule text-ink-soft hover:bg-tile hover:text-ink",
              )}
            >
              <Icon className={cn("size-5", on && "text-brand")} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-xs text-pretty text-ink-soft">
        {pref === "system" ? "Follows your computer's light or dark setting." : `Always ${pref}.`} Press{" "}
        <kbd className="font-mono text-[11px]">Shift D</kbd> to switch.
      </p>
    </PanelSection>
  );
}

/** Whether version a is newer than b (x.y.z). */
function isNewer(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}

function UpdatesSection({ version }: { version: string | null }) {
  const status = useUpdateStatus();
  const latest = useLatestVersion();
  const newer = !!(latest && version && isNewer(latest, version));
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
          <dl className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-tile px-2.5 py-1.5">
              <dt className="text-[11px] text-ink-soft">Installed</dt>
              <dd className="font-mono text-[13px] font-medium text-ink tabular">{version ?? "…"}</dd>
            </div>
            <div className={cn("rounded-md px-2.5 py-1.5", newer ? "bg-brand-wash" : "bg-tile")}>
              <dt className="text-[11px] text-ink-soft">Latest</dt>
              <dd className={cn("font-mono text-[13px] font-medium tabular", newer ? "text-brand" : "text-ink")}>{latest ?? "…"}</dd>
            </div>
          </dl>
          {status.state === "downloading" && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-aqua transition-[width] duration-200" style={{ width: `${status.percent}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        {status.state === "ready" ? (
          <Button className="w-full" onClick={() => void bridge?.installUpdate()}>
            <RotateCcw /> Restart and update
          </Button>
        ) : status.state === "manual" ? (
          <Button className="w-full" onClick={() => void bridge?.openDownload()}>
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
  const webFolder = useWebFolder();
  const web = !bridge && canPickFolder();
  const dir = bridge ? (settings?.downloadDir ?? null) : webFolder;

  if (!bridge && !web) {
    return (
      <PanelSection title="Export folder">
        <p className="-mt-1 text-[13px] text-pretty text-ink-soft">
          Exports go to your browser&apos;s downloads. Open Bubble Studio in Chrome or Edge, or use the desktop app, to
          save into one organised folder.
        </p>
      </PanelSection>
    );
  }

  const choose = async () => {
    if (bridge) onChange(await bridge.chooseDownloadDir());
    else await chooseWebFolder().catch(() => {});
  };
  const clear = async () => {
    if (bridge) onChange(await bridge.clearDownloadDir());
    else await clearWebFolder();
  };

  return (
    <PanelSection title="Export folder">
      <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
        {dir
          ? "Every export is sorted into a folder by type. Existing files are never overwritten; a number is added."
          : bridge
            ? "Choose one master folder and exports are sorted into it by type. Until then you pick a place each time."
            : "Choose one master folder and exports are sorted into it by type. Until then they go to your downloads."}
      </p>
      <div className="rounded-lg border border-rule bg-tile/50 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={dir ?? ""}>
            {dir ?? "No folder chosen"}
          </span>
        </div>
        <ul className="mt-2 grid gap-1 border-l border-rule pl-3 ml-2" aria-label="Subfolders">
          {Object.values(EXPORT_FOLDERS).map((name) => (
            <li key={name} className="flex items-center gap-2 text-xs text-ink-soft">
              <Folder className="size-3.5 shrink-0" />
              {name}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 grid gap-2">
        <Button onClick={() => void choose()}>
          {dir ? "Change folder…" : "Choose a folder…"}
        </Button>
        {dir && (
          <div className={cn("grid gap-2", bridge ? "grid-cols-2" : "grid-cols-1")}>
            {bridge && (
              <Button variant="outline" onClick={() => void bridge.openDownloadDir()}>
                Open folder
              </Button>
            )}
            <Button variant="ghost" onClick={() => void clear()}>
              {bridge ? "Ask every time" : "Use downloads"}
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
