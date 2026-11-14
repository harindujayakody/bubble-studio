"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, Download, FileUp, Film, ImageIcon, Pause, Play, Plus, Scissors, Smile, Trash2, Type, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { PanelSection } from "./controls";
import { MusicSection, OriginalSound } from "./music-panel";
import type { LibraryTrack } from "@/lib/editor/sticker-library";
import { formatTime, seekVideo, setVideoMuted } from "@/lib/editor/video";
import { layerName, nextZ, stackOrder } from "@/lib/editor/layers";
import { keptParts, reelAt, reelLength, removePart, speedOf, splitAt } from "@/lib/editor/segments";
import { CAPTION_STYLES, buildSrt, captionLook, captionStyleOf, parseSrt, spreadLines, type CaptionStyle, type Cue } from "@/lib/editor/captions";
import { SINHALA_RE } from "@/lib/editor/fonts";
import { saveExport } from "@/lib/editor/save";
import { Segmented } from "./watermark-panel";
import type { PostState, TextLayer, Timing, VideoClip } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;

const SPEEDS = ["0.5", "0.75", "1", "1.25", "1.5", "2"] as const;

/** Text → Captions (reels): lines shown one after another, typed, pasted or from an .srt. */
export function CaptionsSection({
  state,
  update,
  video,
  onSelect,
}: {
  state: PostState;
  update: Update;
  video: HTMLVideoElement | undefined;
  onSelect: (id: string | null) => void;
}) {
  const clip = state.video!;
  const captions = state.texts.filter((t) => t.caption).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const [picked, setPicked] = useState<CaptionStyle>("box");
  const style = captions.length ? captionStyleOf(captions[0]) : picked;
  const [script, setScript] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const layer = (c: Cue, z: number): TextLayer => ({
    id: crypto.randomUUID(),
    text: c.text,
    start: c.start,
    end: c.end,
    z,
    ...captionLook(style, SINHALA_RE.test(c.text)),
  });
  // Pasted lines and .srt files replace the captions; "at playhead" adds one.
  const replace = (cues: Cue[]) => {
    if (!cues.length) return toast("No captions found");
    update((s) => {
      const rest = s.texts.filter((t) => !t.caption);
      const z = nextZ({ texts: rest, stickers: s.stickers });
      return { ...s, texts: [...rest, ...cues.map((c, i) => layer(c, z + i))] };
    });
    onSelect(null);
    toast.success(`${cues.length} caption${cues.length === 1 ? "" : "s"} added`);
  };
  const addAtPlayhead = () => {
    const t = video?.currentTime ?? keptParts(clip)[0].start;
    const c = layer({ start: t, end: Math.min(t + 2, clip.trimEnd), text: "Caption" }, nextZ(state));
    update((s) => ({ ...s, texts: [...s.texts, c] }));
    onSelect(c.id);
  };
  const setStyle = (st: CaptionStyle) => {
    setPicked(st);
    update((s) => ({
      ...s,
      texts: s.texts.map((t) => (t.caption ? { ...t, ...captionLook(st, SINHALA_RE.test(t.text)), id: t.id, text: t.text, start: t.start, end: t.end, z: t.z } : t)),
    }));
  };
  const downloadSrt = () => {
    const srt = buildSrt(
      captions.map((c) => ({ start: c.start ?? clip.trimStart, end: c.end ?? clip.trimEnd, text: c.text })),
      clip,
    );
    void saveExport(new Blob([srt], { type: "application/x-subrip" }), `${clip.name.replace(/\.[^.]+$/, "")}-captions.srt`, "reels");
  };

  return (
    <PanelSection title="Captions">
      <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
        Most reels are watched with the sound off. Add lines that show one after another.
      </p>
      <div className="grid gap-3">
        <Segmented label="Caption style" value={style} onChange={setStyle} options={CAPTION_STYLES} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addAtPlayhead}>
            <Plus /> Add at playhead
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp /> Import .srt
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) replace(parseSrt(await f.text()));
            }}
          />
        </div>
        <Textarea
          value={script}
          rows={3}
          placeholder={"Paste your script, one caption per line"}
          aria-label="Caption lines"
          onChange={(e) => setScript(e.target.value)}
        />
        <Button size="sm" variant="secondary" disabled={!script.trim()} onClick={() => replace(spreadLines(script, clip))} className="w-fit">
          <Captions /> Spread lines over the reel
        </Button>

        {captions.length > 0 && (
          <>
            <ol className="grid max-h-56 gap-1 overflow-y-auto" aria-label="Captions">
              {captions.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-md border border-rule py-1 pr-1 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      if (video && c.start !== undefined) seekVideo(video, c.start);
                    }}
                    className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-aqua"
                  >
                    <span className="shrink-0 font-mono text-[11px] text-ink-soft tabular">{formatTime(reelAt(clip, c.start ?? clip.trimStart))}</span>
                    <span className="truncate">{c.text}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete caption: ${c.text}`}
                    onClick={() => update((s) => ({ ...s, texts: s.texts.filter((t) => t.id !== c.id) }))}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadSrt}>
                <Download /> Download .srt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update((s) => ({ ...s, texts: s.texts.filter((t) => !t.caption) }))}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove all
              </Button>
            </div>
          </>
        )}
      </div>
    </PanelSection>
  );
}

/** Reel setup: the clip, its trim and its sound. */
export function VideoPanel({
  state,
  update,
  video,
  onPickVideo,
  onRemoveVideo,
  musicLibrary,
  onPickMusic,
  onUploadMusic,
  onMusicFromVideo,
}: {
  state: PostState;
  update: Update;
  video: HTMLVideoElement | undefined;
  onPickVideo: () => void;
  onRemoveVideo: () => void;
  musicLibrary: LibraryTrack[];
  onPickMusic: (track: LibraryTrack) => void;
  onUploadMusic: () => void;
  onMusicFromVideo: () => void;
}) {
  const clip = state.video;
  const setClip = (p: Partial<VideoClip>, key?: string) =>
    update((s) => (s.video ? { ...s, video: { ...s.video, ...p } } : s), key);

  if (!clip) {
    return (
      <PanelSection title="Video">
        <p className="mb-3 text-sm text-pretty text-ink-soft">
          Add a clip from your phone or computer. MP4 and WebM work best. It stays on your computer.
        </p>
        <Button onClick={onPickVideo}>
          <Film /> Choose video
        </Button>
      </PanelSection>
    );
  }

  const length = reelLength(clip);
  const parts = keptParts(clip);
  const split = () => {
    const next = video && splitAt(clip, video.currentTime);
    if (!next) return toast("Move the playhead inside a part to split it", { description: "Each side needs at least 0.2 seconds." });
    setClip({ parts: next });
  };
  return (
    <>
      <PanelSection title="Video">
        <p className="truncate text-sm text-ink" title={clip.name}>
          {clip.name}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-soft tabular">
          {video ? `${video.videoWidth} × ${video.videoHeight}` : ""} · {formatTime(clip.duration)}
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={onPickVideo}>
            <Film /> Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemoveVideo} className="text-destructive hover:text-destructive">
            <Trash2 /> Remove
          </Button>
        </div>
      </PanelSection>

      <PanelSection title="Trim">
        <p className="-mt-1 mb-4 text-[13px] text-pretty text-ink-soft">
          Drag the ends to keep only the part you want. Facebook reels can be up to 90 seconds.
        </p>
        <Slider
          aria-label="Trim"
          min={0}
          max={clip.duration}
          step={0.1}
          minStepsBetweenValues={5}
          value={[clip.trimStart, clip.trimEnd]}
          onValueChange={(v) => {
            const [a, b] = v as number[];
            if (video) seekVideo(video, a !== clip.trimStart ? a : Math.max(a, b - 0.5));
            setClip({ trimStart: a, trimEnd: b }, "trim");
          }}
        />
        <div className="mt-2 flex justify-between font-mono text-xs text-ink-soft tabular">
          <span>{formatTime(clip.trimStart)}</span>
          <span className={cn(length > 90 ? "text-destructive" : "text-aqua-ink")}>{formatTime(length)} long</span>
          <span>{formatTime(clip.trimEnd)}</span>
        </div>
        {length > 90 && (
          <p className="mt-2 text-xs text-destructive">
            That&apos;s over 90 seconds. Trim it shorter so Facebook accepts it as a reel.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Cut and speed">
        <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
          Split at the playhead, then delete the parts you don&apos;t want. The rest plays back to back.
        </p>
        <Button variant="outline" size="sm" onClick={split} disabled={!video}>
          <Scissors /> Split at playhead
        </Button>
        {parts.length > 1 && (
          <ol className="mt-3 grid gap-1" aria-label="Parts">
            {parts.map((p, i) => (
              <li key={`${p.start}-${p.end}`} className="flex items-center gap-2 rounded-md border border-rule py-1 pr-1 pl-2">
                <button
                  type="button"
                  onClick={() => video && seekVideo(video, p.start)}
                  className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-aqua"
                >
                  <span className="font-medium">Part {i + 1}</span>
                  <span className="truncate font-mono text-xs text-ink-soft tabular">
                    {formatTime(p.start)} – {formatTime(p.end)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete part ${i + 1}`}
                  onClick={() => setClip({ parts: removePart(clip, i) ?? undefined })}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 grid gap-1.5">
          <span className="text-[13px] text-ink-soft">Speed</span>
          <Segmented
            label="Playback speed"
            value={String(speedOf(clip)) as (typeof SPEEDS)[number]}
            onChange={(v) => setClip({ speed: Number(v) === 1 ? undefined : Number(v) })}
            options={SPEEDS.map((s) => ({ id: s, label: `${s}×` }))}
          />
        </div>
      </PanelSection>

      <OriginalSound clip={clip} update={update} />
      <MusicSection state={state} update={update} library={musicLibrary} onPick={onPickMusic} onUpload={onUploadMusic} onFromVideo={onMusicFromVideo} />
    </>
  );
}

/** Play, pause and scrub, under the canvas. */
export function VideoBar({ video, clip }: { video: HTMLVideoElement; clip: VideoClip }) {
  const [playing, setPlaying] = useState(!video.paused);
  const [time, setTime] = useState(video.currentTime);
  const [muted, setMuted] = useState(video.muted);

  useEffect(() => {
    const sync = () => {
      setPlaying(!video.paused);
      setTime(video.currentTime);
      setMuted(video.muted);
    };
    const events = ["play", "pause", "timeupdate", "seeked", "volumechange"] as const;
    events.forEach((e) => video.addEventListener(e, sync));
    return () => events.forEach((e) => video.removeEventListener(e, sync));
  }, [video]);

  const toggle = () => {
    if (video.paused) {
      if (video.currentTime < clip.trimStart || video.currentTime >= clip.trimEnd) seekVideo(video, keptParts(clip)[0].start);
      void video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pb-1">
      <Button
        size="icon"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="rounded-full bg-ink text-sheet hover:bg-ink/85"
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Slider
        aria-label="Playhead"
        className="flex-1"
        min={clip.trimStart}
        max={clip.trimEnd}
        step={0.05}
        value={[Math.min(clip.trimEnd, Math.max(clip.trimStart, time))]}
        onValueChange={(v) => {
          seekVideo(video, Array.isArray(v) ? v[0] : (v as number));
        }}
      />
      <span className="shrink-0 text-right font-mono text-xs whitespace-nowrap text-ink-soft tabular">
        {formatTime(reelAt(clip, time))} / {formatTime(reelLength(clip))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={muted ? "Unmute preview" : "Mute preview"}
        onClick={() => setVideoMuted(video, !video.muted)}
      >
        {muted ? <VolumeX /> : <Volume2 />}
      </Button>
    </div>
  );
}

/** Re-renders a few times a second with the clip's playback time. */
function useVideoTime(video: HTMLVideoElement) {
  const [time, setTime] = useState(video.currentTime);
  useEffect(() => {
    const sync = () => setTime(video.currentTime);
    const events = ["timeupdate", "seeked"] as const;
    events.forEach((e) => video.addEventListener(e, sync));
    return () => events.forEach((e) => video.removeEventListener(e, sync));
  }, [video]);
  return time;
}

/** One row per text or sticker: drag the bar's ends to set when it shows in the reel. */
export function Timeline({
  state,
  video,
  clip,
  selectedId,
  onSelect,
  onTiming,
}: {
  state: PostState;
  video: HTMLVideoElement;
  clip: VideoClip;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTiming: (id: string, timing: Timing) => void;
}) {
  const time = useVideoTime(video);
  const rows = stackOrder(state).reverse();
  if (rows.length === 0) return null;

  const span = Math.max(0.1, clip.trimEnd - clip.trimStart);
  const playhead = Math.min(1, Math.max(0, (time - clip.trimStart) / span)) * 100;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-1 pb-2">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold text-ink-soft">Timeline</span>
        <span className="truncate text-[11px] text-ink-soft">Drag the ends of a bar to set when it shows</span>
      </div>
      <ul className="max-h-40 overflow-y-auto rounded-md border border-rule bg-sheet py-1" aria-label="Timeline">
        {rows.map((item) => {
          const start = Math.max(clip.trimStart, item.layer.start ?? clip.trimStart);
          const end = Math.min(clip.trimEnd, item.layer.end ?? clip.trimEnd);
          const active = item.id === selectedId;
          const showing = start <= time && time < end;
          const Icon = item.kind === "text" ? Type : item.layer.kind === "image" ? ImageIcon : Smile;
          return (
            <li
              key={item.id}
              className={cn(
                "grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 px-2 py-1",
                active && "bg-aqua-wash",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-aqua",
                  showing ? "text-ink" : "text-ink-soft",
                )}
                title={layerName(item)}
              >
                <Icon className={cn("size-3.5 shrink-0", item.kind === "text" ? "text-brand" : "text-ink-soft")} />
                <span className="truncate">{layerName(item)}</span>
              </button>
              <div className="relative">
                <Slider
                  aria-label={`When ${layerName(item)} shows`}
                  min={clip.trimStart}
                  max={clip.trimEnd}
                  step={0.1}
                  minStepsBetweenValues={2}
                  value={[start, end]}
                  onValueChange={(v) => {
                    const [a, b] = v as number[];
                    onSelect(item.id);
                    // Snap to "whole clip" at the ends so trimming the video later keeps it showing throughout.
                    onTiming(item.id, {
                      start: a <= clip.trimStart + 0.05 ? undefined : a,
                      end: b >= clip.trimEnd - 0.05 ? undefined : b,
                    });
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-y-1.5 w-px bg-brand"
                  style={{ left: `${playhead}%` }}
                />
              </div>
              <span className="text-right font-mono text-[10px] whitespace-nowrap text-ink-soft tabular">
                {formatTime(end - start)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
