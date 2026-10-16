"use client";

import { useEffect, useState } from "react";
import { Film, Pause, Play, Trash2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { PanelSection } from "./controls";
import { formatTime, seekVideo, setVideoMuted } from "@/lib/editor/video";
import type { PostState, VideoClip } from "@/lib/editor/types";

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
        <Button onClick={onPickVideo} className="bg-magenta text-white hover:bg-magenta-ink">
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
          <span className={cn(length > 90 ? "text-destructive" : "text-cyan-ink")}>{formatTime(length)} long</span>
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
