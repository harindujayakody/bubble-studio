"use client";

import { useEffect, useState } from "react";
import { Film, ImageIcon, Pause, Play, Smile, Trash2, Type, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { PanelSection } from "./controls";
import { formatTime, seekVideo, setVideoMuted } from "@/lib/editor/video";
import { layerName, stackOrder } from "@/lib/editor/layers";
import type { PostState, Timing, VideoClip } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;

/** Reel setup: the clip, its trim and its sound. */
export function VideoPanel({
  state,
  update,
  video,
  onPickVideo,
  onRemoveVideo,
}: {
  state: PostState;
  update: Update;
  video: HTMLVideoElement | undefined;
  onPickVideo: () => void;
  onRemoveVideo: () => void;
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
        <Button onClick={onPickVideo} className="bg-brand text-white hover:bg-brand-ink">
          <Film /> Choose video
        </Button>
      </PanelSection>
    );
  }

  const length = clip.trimEnd - clip.trimStart;
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

      <PanelSection title="Sound">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-pretty text-ink-soft">Keep the video&apos;s own sound in the export</span>
          <Toggle
            variant="outline"
            size="sm"
            pressed={clip.audio}
            onPressedChange={(v) => setClip({ audio: v })}
            className="min-w-14"
          >
            {clip.audio ? "On" : "Off"}
          </Toggle>
        </div>
      </PanelSection>
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
      if (video.currentTime < clip.trimStart || video.currentTime >= clip.trimEnd) seekVideo(video, clip.trimStart);
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
        {formatTime(Math.max(0, time - clip.trimStart))} / {formatTime(clip.trimEnd - clip.trimStart)}
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
        <span className="slug text-[11px] text-ink-soft">Timeline</span>
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
