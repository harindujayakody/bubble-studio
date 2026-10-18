"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, AudioLines, CheckCircle2, Film, LoaderCircle, Plus, Trash2, TriangleAlert, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AUDIO_FORMATS,
  MERGE_SIZES,
  extractAudio,
  mergeVideos,
  readClip,
  type AudioFormat,
  type ClipInfo,
  type MergeFit,
  type MergeSize,
} from "@/lib/editor/media-tools";
import { saveExport } from "@/lib/editor/save";
import { canFastExport, probeVideo } from "@/lib/editor/fast-export";
import { formatTime } from "@/lib/editor/video";
import { MergeIcon, StartFooter } from "./start-screen";

const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,video/x-m4v,video/*";
const baseName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "video";
const mb = (n: number) => `${(n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)} MB`;

/** Shared frame for the stand-alone tools: back link, title, a drop zone and the work area. */
function ToolFrame({
  icon,
  title,
  body,
  onBack,
  onFiles,
  dropLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onBack: () => void;
  onFiles: (files: File[]) => void;
  dropLabel: string;
  children: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-8 md:px-8 md:pt-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-aqua"
        >
          <ArrowLeft className="size-4" /> Home
        </button>
        <div className="flex items-start gap-4">
          <span className="tool-button grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-wash text-brand" data-active>
            {icon}
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.01em] text-ink md:text-[28px]">{title}</h1>
            <p className="mt-1 max-w-[56ch] text-[15px] text-pretty text-ink-soft">{body}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setOver(true);
            }
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "mt-6 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
            over ? "border-aqua bg-aqua-wash" : "border-rule bg-sheet hover:border-brand hover:bg-brand-wash/50",
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-brand text-white">
            <Upload className="size-5" />
          </span>
          <span className="font-heading text-[15px] font-semibold text-ink">{dropLabel}</span>
          <span className="text-[13px] text-ink-soft">or drop them here · MP4, MOV and WebM · nothing is uploaded</span>
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT_VIDEO}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {children}
        <StartFooter />
      </div>
    </main>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-tile" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

/* ----------------------------------------------------------- extract audio */

type AudioJob = {
  id: string;
  file: File;
  duration: number | null;
  status: "ready" | "working" | "done" | "error";
  progress: number;
  message?: string;
};

export function ExtractAudioScreen({ onBack }: { onBack: () => void }) {
  const [jobs, setJobs] = useState<AudioJob[]>([]);
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [busy, setBusy] = useState(false);
  const patch = (id: string, p: Partial<AudioJob>) => setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...p } : j)));

  const add = (files: File[]) => {
    const videos = files.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
    if (videos.length < files.length) toast("Some files were skipped", { description: "Only video files can be added." });
    const next = videos.map((file) => ({ id: crypto.randomUUID(), file, duration: null, status: "ready" as const, progress: 0 }));
    setJobs((list) => [...list, ...next]);
    for (const j of next) {
      void readClip(j.file)
        .then((info) => patch(j.id, { duration: info.duration, ...(info.hasAudio ? {} : { status: "error", message: "No sound in this video" }) }))
        .catch(() => patch(j.id, { status: "error", message: "This video can't be read here" }));
    }
  };

  const run = async () => {
    setBusy(true);
    let saved = 0;
    for (const job of jobs) {
      if (job.status !== "ready") continue;
      patch(job.id, { status: "working", progress: 0 });
      try {
        const blob = await extractAudio(job.file, format, (p) => patch(job.id, { progress: p }));
        const where = await saveExport(blob, `${baseName(job.file.name)}.${format}`, "audios");
        patch(job.id, { status: "done", progress: 1, message: where ?? `${format.toUpperCase()} · ${mb(blob.size)}` });
        saved++;
      } catch (err) {
        patch(job.id, { status: "error", message: err instanceof Error ? err.message : "Couldn't extract the sound" });
      }
    }
    setBusy(false);
    if (saved) toast.success(saved === 1 ? "Audio saved" : `${saved} audio files saved`);
  };

  const ready = jobs.filter((j) => j.status === "ready").length;

  return (
    <ToolFrame
      icon={<AudioLines className="size-7" strokeWidth={1.75} />}
      title="Extract audio"
      body="Save the sound from your videos as audio files: for music, voice-overs or podcasts."
      onBack={onBack}
      onFiles={add}
      dropLabel="Choose videos"
    >
      {jobs.length > 0 && (
        <section className="mt-6 rounded-2xl bg-sheet p-4 shadow-float md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1.5">
              <span className="text-[13px] text-ink-soft">Save as</span>
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[format]}
                onValueChange={(v) => v[0] && setFormat(v[0] as AudioFormat)}
                disabled={busy}
              >
                {AUDIO_FORMATS.map((f) => (
                  <ToggleGroupItem key={f.id} value={f.id} className="px-4" title={f.note}>
                    {f.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <p className="text-xs text-ink-soft">{AUDIO_FORMATS.find((f) => f.id === format)?.note}</p>
          </div>

          <ul className="mt-4 grid gap-2">
            {jobs.map((j) => (
              <li key={j.id} className="grid gap-2 rounded-xl border border-rule px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-tile text-ink-soft">
                    {j.status === "working" ? (
                      <LoaderCircle className="size-4 animate-spin text-brand" />
                    ) : j.status === "done" ? (
                      <CheckCircle2 className="size-4 text-aqua-ink" />
                    ) : j.status === "error" ? (
                      <TriangleAlert className="size-4 text-destructive" />
                    ) : (
                      <Film className="size-4" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">{j.file.name}</span>
                    <span className={cn("truncate text-xs", j.status === "error" ? "text-destructive" : "text-ink-soft")}>
                      {j.message ?? `${j.duration !== null ? formatTime(j.duration) : "…"} · ${mb(j.file.size)}`}
                    </span>
                  </span>
                  {!busy && j.status !== "working" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${j.file.name}`}
                      onClick={() => setJobs((list) => list.filter((x) => x.id !== j.id))}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {j.status === "working" && <Progress value={j.progress} />}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void run()} disabled={busy || ready === 0} className="h-10 bg-brand px-4 text-white hover:bg-brand-ink">
              <AudioLines /> {busy ? "Extracting…" : ready > 1 ? `Extract ${ready} files` : "Extract audio"}
            </Button>
            {!busy && jobs.some((j) => j.status === "done" || j.status === "error") && (
              <Button variant="ghost" className="h-10" onClick={() => setJobs((list) => list.filter((j) => j.status === "ready"))}>
                Clear finished
              </Button>
            )}
          </div>
        </section>
      )}
    </ToolFrame>
  );
}

/* ------------------------------------------------------------ merge videos */

type Clip = { id: string; file: File; info: ClipInfo | null; poster: string | null; error?: string };

export function MergeVideosScreen({ onBack }: { onBack: () => void }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [size, setSize] = useState<MergeSize>("first");
  const [fit, setFit] = useState<MergeFit>("fit");
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const busy = progress !== null;

  const add = (files: File[]) => {
    const videos = files.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
    if (videos.length < files.length) toast("Some files were skipped", { description: "Only video files can be added." });
    const next: Clip[] = videos.map((file) => ({ id: crypto.randomUUID(), file, info: null, poster: null }));
    setClips((list) => [...list, ...next]);
    for (const c of next) {
      void (async () => {
        try {
          const [info, probe] = await Promise.all([readClip(c.file), probeVideo(c.file)]);
          const thumb = document.createElement("canvas");
          const scale = 160 / Math.max(probe.width, probe.height, 1);
          thumb.width = Math.max(1, Math.round(probe.width * scale));
          thumb.height = Math.max(1, Math.round(probe.height * scale));
          thumb.getContext("2d")?.drawImage(probe.poster, 0, 0, thumb.width, thumb.height);
          setClips((list) => list.map((x) => (x.id === c.id ? { ...x, info, poster: thumb.toDataURL("image/jpeg", 0.7) } : x)));
        } catch (err) {
          setClips((list) =>
            list.map((x) => (x.id === c.id ? { ...x, error: err instanceof Error ? err.message : "This video can't be read here" } : x)),
          );
        }
      })();
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setClips((list) => {
      const next = [...list];
      const [c] = next.splice(i, 1);
      next.splice(i + d, 0, c);
      return next;
    });

  const usable = clips.filter((c) => c.info && !c.error);
  const total = usable.reduce((s, c) => s + c.info!.duration, 0);
  const loading = clips.some((c) => !c.info && !c.error);

  const merge = async () => {
    abort.current = new AbortController();
    setProgress(0);
    try {
      const blob = await mergeVideos({
        files: usable.map((c) => c.file),
        infos: usable.map((c) => c.info!),
        size,
        fit,
        onProgress: setProgress,
        signal: abort.current.signal,
      });
      const where = await saveExport(blob, "merged-video.mp4", "merged");
      toast.success("Merged video saved", { description: `${where ?? "merged-video.mp4"} · ${mb(blob.size)}` });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") toast("Merge cancelled");
      else toast.error("Merge failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  return (
    <ToolFrame
      icon={<MergeIcon className="size-7" />}
      title="Merge videos"
      body="Join clips end to end into one MP4. Put them in order, pick a size, and merge."
      onBack={onBack}
      onFiles={add}
      dropLabel="Choose videos"
    >
      {!canFastExport() && (
        <p className="mt-4 rounded-xl bg-yellow-wash px-3 py-2.5 text-[13px] text-ink">
          This browser can&apos;t encode video. Use the latest Chrome or Edge, or the desktop app, to merge clips.
        </p>
      )}
      {clips.length > 0 && (
        <section className="mt-6 rounded-2xl bg-sheet p-4 shadow-float md:p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-[15px] font-semibold text-ink">Clips in order</h2>
            <span className="font-mono text-xs text-ink-soft tabular">
              {usable.length} clip{usable.length === 1 ? "" : "s"} · {formatTime(total)}
            </span>
          </div>
          <ol className="mt-3 grid gap-2">
            {clips.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-rule p-2 pr-1.5">
                <span className="w-5 shrink-0 text-center font-mono text-xs text-ink-soft tabular">{i + 1}</span>
                <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-black">
                  {c.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.poster} alt="" className="max-h-full max-w-full object-contain" />
                  ) : c.error ? (
                    <TriangleAlert className="size-4 text-destructive" />
                  ) : (
                    <LoaderCircle className="size-4 animate-spin text-white/70" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{c.file.name}</span>
                  <span className={cn("truncate text-xs", c.error ? "text-destructive" : "text-ink-soft")}>
                    {c.error ??
                      (c.info
                        ? `${formatTime(c.info.duration)} · ${c.info.width} × ${c.info.height}${c.info.hasAudio ? "" : " · no sound"}`
                        : "Reading…")}
                  </span>
                </span>
                <span className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={busy || i === clips.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${c.file.name}`}
                    disabled={busy}
                    onClick={() => setClips((list) => list.filter((x) => x.id !== c.id))}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-[13px] text-ink-soft">Size</span>
              <div className="grid gap-1.5" role="radiogroup" aria-label="Output size">
                {MERGE_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={size === s.id}
                    disabled={busy}
                    onClick={() => setSize(s.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                      size === s.id ? "border-brand bg-brand-wash text-ink" : "border-rule text-ink hover:bg-tile",
                    )}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="font-mono text-[11px] text-ink-soft tabular">{s.id === "first" && usable[0]?.info ? `${usable[0].info.width} × ${usable[0].info.height}` : s.detail}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid content-start gap-2">
              <span className="text-[13px] text-ink-soft">When a clip&apos;s shape is different</span>
              <ToggleGroup variant="outline" spacing={0} value={[fit]} onValueChange={(v) => v[0] && setFit(v[0] as MergeFit)} disabled={busy} className="w-full">
                <ToggleGroupItem value="fit" className="flex-1">Fit, with bars</ToggleGroupItem>
                <ToggleGroupItem value="fill" className="flex-1">Fill, crop edges</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-pretty text-ink-soft">
                {fit === "fit" ? "The whole clip shows, with black bars where it doesn't fill the frame." : "Each clip fills the frame; edges outside it are cut off."}
              </p>
            </div>
          </div>

          <div className="mt-5">
            {busy ? (
              <div className="grid gap-2" role="status" aria-live="polite">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-ink">Merging…</span>
                  <span className="font-mono text-xs text-ink-soft tabular">{Math.round((progress ?? 0) * 100)}%</span>
                </div>
                <Progress value={progress ?? 0} />
                <Button variant="outline" className="w-fit" onClick={() => abort.current?.abort()}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => void merge()}
                disabled={usable.length < 2 || loading || !canFastExport()}
                className="h-10 bg-brand px-4 text-white hover:bg-brand-ink"
              >
                <MergeIcon className="size-4" />
                {usable.length < 2 ? "Add at least 2 videos" : loading ? "Reading clips…" : `Merge ${usable.length} videos`}
              </Button>
            )}
          </div>
        </section>
      )}
      {clips.length > 0 && !busy && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Plus className="size-3.5" /> Add more clips with the button above; they join at the end.
        </p>
      )}
    </ToolFrame>
  );
}
