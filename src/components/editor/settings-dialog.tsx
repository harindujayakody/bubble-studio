"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FolderOpen, HardDrive, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteDraft, setAutosave } from "@/lib/editor/draft";
import { clearPhrases } from "@/lib/editor/phrases";
import { useIsDesktop, type DesktopSettings } from "./desktop-updates";

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

/** Settings: where exports go (desktop), what's stored and how to clear it, and about the app. */
export function SettingsDialog() {
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const refreshUsage = async () => {
    try {
      const est = await navigator.storage?.estimate?.();
      setUsage(est?.usage ?? null);
    } catch {
      setUsage(null);
    }
  };

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const bridge = typeof window === "undefined" ? undefined : window.bubbleDesktop;

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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirmReset(false);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Settings" title="Settings" />}>
        <Settings />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Everything here stays on this {desktop ? "computer" : "browser"}.</DialogDescription>
        </DialogHeader>

        {desktop && bridge && (
          <Section title="Downloads">
            <p className="text-[13px] text-pretty text-ink-soft">
              {settings?.downloadDir
                ? "Exports save straight to this folder. Files are never overwritten; a number is added instead."
                : "You choose where each export goes when you save it."}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-rule bg-muted/50 px-3 py-2">
              <FolderOpen className="size-4 shrink-0 text-ink-soft" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={settings?.downloadDir ?? ""}>
                {settings?.downloadDir ?? "Ask every time"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-brand text-white hover:bg-brand-ink"
                onClick={async () => setSettings(await bridge.chooseDownloadDir())}
              >
                {settings?.downloadDir ? "Change folder…" : "Choose a folder…"}
              </Button>
              {settings?.downloadDir && (
                <>
                  <Button size="sm" variant="outline" onClick={() => void bridge.openDownloadDir()}>
                    Open folder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => setSettings(await bridge.clearDownloadDir())}>
                    Ask every time
                  </Button>
                </>
              )}
            </div>
          </Section>
        )}

        <Section title="Storage">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-soft">
            <HardDrive className="size-4" />
            {usage === null ? "Checking storage…" : `Using ${formatSize(usage)} for saved posts, phrases and settings.`}
          </div>
          <ul className="grid gap-1">
            <ClearRow
              label="Auto-saved post"
              detail="The last post kept for Continue, including its photos and videos."
              onClear={async () => {
                await deleteDraft();
                await refreshUsage();
                toast("Saved post cleared");
              }}
            />
            <ClearRow
              label="Saved phrases"
              detail="Phrases you imported into the Text panel."
              onClear={async () => {
                clearPhrases();
                await refreshUsage();
                toast("Saved phrases cleared");
              }}
            />
            {desktop && bridge && (
              <ClearRow
                label="App cache"
                detail="Temporary files and any update installers already downloaded."
                onClear={async () => {
                  const { updates } = await bridge.clearCache();
                  await refreshUsage();
                  toast("Cache cleared", {
                    description: updates ? `Freed ${formatSize(updates)} of downloaded updates.` : undefined,
                  });
                }}
              />
            )}
          </ul>
          <div className="mt-4 rounded-md border border-destructive/30 p-3">
            {confirmReset ? (
              <div className="grid gap-2">
                <p className="text-[13px] text-pretty text-ink">
                  Remove your saved post, phrases and all settings{desktop ? ", including the download folder" : ""}? The
                  app restarts fresh. Your exported files are not touched.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => void resetAll()}>
                    Reset everything
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-soft">Start over with a clean app.</span>
                <Button size="sm" variant="destructive" onClick={() => setConfirmReset(true)}>
                  Reset everything…
                </Button>
              </div>
            )}
          </div>
        </Section>

        <Section title="About">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.png" alt="" width={40} height={40} className="size-10 rounded-[10px]" />
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold text-ink">
                Bubble Studio{version ? ` ${version}` : ""}
              </p>
              <p className="text-xs text-ink-soft">
                Made by Harindu Jayakody · A product of{" "}
                <a
                  href="https://infiax.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-ink underline-offset-2 hover:underline"
                >
                  Infiax.com <ExternalLink className="size-3" />
                </a>
              </p>
            </div>
          </div>
        </Section>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-4 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function ClearRow({ label, detail, onClear }: { label: string; detail: string; onClear: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-pretty text-ink-soft">{detail}</span>
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
