"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { PanelSection, RangeField } from "./controls";
import { formatTime } from "@/lib/editor/video";
import type { LibraryTrack } from "@/lib/editor/sticker-library";
import type { MusicTrack, PostState, VideoClip } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;

/** The clip's own sound: on/off and level. */
export function OriginalSound({ clip, update }: { clip: VideoClip; update: Update }) {
  const set = (p: Partial<VideoClip>, key?: string) =>
    update((s) => (s.video ? { ...s, video: { ...s.video, ...p } } : s), key);
  return (
    <PanelSection
      title="Original sound"
      action={
        <Toggle
          variant="outline"
          size="sm"
          pressed={clip.audio}
          onPressedChange={(v) => set({ audio: v })}
          aria-label={clip.audio ? "Mute original sound" : "Unmute original sound"}
          className="gap-1.5 px-2.5"
        >
          {clip.audio ? <Volume2 /> : <VolumeX />}
          {clip.audio ? "On" : "Muted"}
        </Toggle>
      }
    >
      <RangeField
        label="Volume"
        value={clip.volume}
        min={0}
        max={100}
        defaultValue={100}
        format={(v) => `${v}%`}
        onChange={(v) => set({ volume: v, audio: v > 0 ? true : clip.audio }, "video:volume")}
      />
    </PanelSection>
  );
}

/** Background music: the chosen track, how it fits the reel, and the library to pick from. */
export function MusicSection({
  state,
  update,
  library,
  onPick,
  onUpload,
}: {
  state: PostState;
  update: Update;
  library: LibraryTrack[];
  onPick: (track: LibraryTrack) => void;
  onUpload: () => void;
}) {
  const clip = state.video;
  const music = state.music;
  const set = (p: Partial<MusicTrack>, key?: string) =>
    update((s) => (s.music ? { ...s, music: { ...s.music, ...p } } : s), key);

  return (
    <>
      {music && clip && (
        <PanelSection
          title="Background music"
          action={
            <Toggle
              variant="outline"
              size="sm"
              pressed={music.on}
              onPressedChange={(v) => set({ on: v })}
              aria-label={music.on ? "Mute music" : "Unmute music"}
              className="gap-1.5 px-2.5"
            >
              {music.on ? <Volume2 /> : <VolumeX />}
              {music.on ? "On" : "Muted"}
            </Toggle>
          }
        >
          <div className="mb-4 flex items-center gap-3 rounded-md bg-brand-wash px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Music className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{music.name}</span>
              <span className="font-mono text-[11px] text-ink-soft tabular">{formatTime(music.duration)}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove music"
              title="Remove music"
              onClick={() => update((s) => ({ ...s, music: null }))}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-5">
            <RangeField
              label="Volume"
              value={music.volume}
              min={0}
              max={100}
              defaultValue={80}
              format={(v) => `${v}%`}
              onChange={(v) => set({ volume: v, on: v > 0 ? true : music.on }, "music:volume")}
            />
            <RangeField
              label="Start the song at"
              value={Math.round(music.offset * 10) / 10}
              min={0}
              max={Math.max(0, Math.floor((music.duration - 1) * 10) / 10)}
              step={0.1}
              defaultValue={0}
              format={(v) => formatTime(v)}
              onChange={(v) => set({ offset: v }, "music:offset")}
            />
            <FitNote music={music} clip={clip} />
            <div className="grid grid-cols-2 gap-2">
              <Toggle variant="outline" size="sm" pressed={music.loop} onPressedChange={(v) => set({ loop: v })}>
                Loop if short
              </Toggle>
              <Toggle variant="outline" size="sm" pressed={music.fade} onPressedChange={(v) => set({ fade: v })}>
                Fade out
              </Toggle>
            </div>
          </div>
        </PanelSection>
      )}

      <PanelSection title={music ? "Change music" : "Background music"}>
        <p className="-mt-1 mb-3 text-[13px] text-pretty text-ink-soft">
          Pick a track. It&apos;s cut to your reel&apos;s length automatically.
        </p>
        <MusicLibrary library={library} current={music?.id ?? null} onPick={onPick} />
        <Button variant="outline" size="sm" className="mt-3" onClick={onUpload}>
          <Upload /> Upload your own
        </Button>
      </PanelSection>
    </>
  );
}

function FitNote({ music, clip }: { music: MusicTrack; clip: VideoClip }) {
  const reel = clip.trimEnd - clip.trimStart;
  const playable = music.duration - music.offset;
  const text =
    playable >= reel
      ? `Plays ${formatTime(music.offset)} to ${formatTime(music.offset + reel)} of the song, matching your ${formatTime(reel)} reel.`
      : music.loop
        ? `The song has ${formatTime(playable)} left from here, so it loops to fill your ${formatTime(reel)} reel.`
        : `The song has ${formatTime(playable)} left from here and stops before your ${formatTime(reel)} reel ends.`;
  return <p className="-mt-2 text-xs text-pretty text-aqua-ink">{text}</p>;
}

/** Track list with a quick listen button; durations load lazily from each file's header. */
function MusicLibrary({
  library,
  current,
  onPick,
}: {
  library: LibraryTrack[];
  current: string | null;
  onPick: (track: LibraryTrack) => void;
}) {
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [listening, setListening] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    for (const t of library) {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => alive && setDurations((d) => ({ ...d, [t.id]: a.duration }));
      a.src = t.src;
    }
    return () => {
      alive = false;
    };
  }, [library]);

  useEffect(() => () => player.current?.pause(), []);

  const listen = (t: LibraryTrack) => {
    player.current?.pause();
    if (listening === t.id) {
      setListening(null);
      return;
    }
    const a = new Audio(t.src);
    a.volume = 0.8;
    a.onended = () => setListening(null);
    void a.play();
    player.current = a;
    setListening(t.id);
  };

  if (library.length === 0) {
    return <p className="text-xs text-ink-soft">No tracks in /public/music yet.</p>;
  }

  return (
    <ul className="grid max-h-72 gap-0.5 overflow-y-auto rounded-md border border-rule p-1" aria-label="Music library">
      {library.map((t) => {
        const active = t.id === current;
        return (
          <li key={t.id} className={cn("flex items-center gap-1 rounded-md pr-1", active ? "bg-aqua-wash" : "hover:bg-muted")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={listening === t.id ? `Stop ${t.name}` : `Listen to ${t.name}`}
              onClick={() => listen(t)}
              className={cn(listening === t.id && "text-brand")}
            >
              {listening === t.id ? <Pause /> : <Play />}
            </Button>
            <button
              type="button"
              onClick={() => {
                player.current?.pause();
                setListening(null);
                onPick(t);
              }}
              aria-current={active || undefined}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-aqua"
            >
              <span className={cn("truncate", active ? "font-semibold text-aqua-ink" : "text-ink")}>{t.name}</span>
              <span className="font-mono text-[11px] text-ink-soft tabular">
                {durations[t.id] ? formatTime(durations[t.id]) : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
