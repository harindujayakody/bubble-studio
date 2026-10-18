"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Crop,
  Download,
  Droplets,
  CloudAlert,
  CloudCheck,
  CloudOff,
  Film,
  Images,
  LoaderCircle,
  Plus,
  ImageIcon,
  Redo2,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteDraft,
  loadDraft,
  peekDraft,
  saveDraft,
  setAutosave,
  useAutosave,
  type Draft,
  type DraftAsset,
  type DraftSummary,
} from "@/lib/editor/draft";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CanvasStage, type RegionDefaults } from "./canvas-stage";
import { SizePreview, StartScreen, type StartStep } from "./start-screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LayersMenu } from "./layers-menu";
import { DesktopUpdates } from "./desktop-updates";
import { BulkPanel, type BulkPhoto } from "./bulk-panel";
import { Timeline, VideoBar, VideoPanel } from "./reel";
import {
  applyClipVolume,
  createFrameCanvas,
  exportReel,
  formatTime,
  loadAudio,
  loadVideo,
  onEachFrame,
  paintFrame,
  reelFormat,
  setMediaMuted,
  syncMusic,
} from "@/lib/editor/video";
import type { LibrarySticker } from "@/lib/editor/stickers";
import type { LibraryTrack } from "@/lib/editor/sticker-library";
import { BlurPanel, ElementsPanel, type NewSticker } from "./panels-extra";
import { AdjustPanel, CropPanel, FiltersPanel, PhotoPanel, TextPanel } from "./panels";
import { RangeField } from "./controls";
import { useHistory } from "@/lib/editor/use-history";
import { canFastExport, fastExportReel } from "@/lib/editor/fast-export";
import { SINHALA_RE } from "@/lib/editor/fonts";
import { nextZ, restack } from "@/lib/editor/layers";
import { inkFor, mix } from "@/lib/editor/color";
import {
  defaultCrop,
  ensureFonts,
  exportDims,
  exportPost,
  fitExport,
  orientImage,
  postDims,
  type Assets,
} from "@/lib/editor/render";
import {
  DEFAULT_FILL,
  DEFAULT_STATE,
  POST_SIZES,
  TEXT_STYLES,
  type PostSizeId,
  type Orientation,
  type Sticker,
  type TextLayer,
  type TextStyleId,
  type ToolId,
} from "@/lib/editor/types";

const TOOLS: { id: ToolId; label: string; icon: typeof ImageIcon; key: string }[] = [
  { id: "photo", label: "Photo", icon: ImageIcon, key: "P" },
  { id: "filters", label: "Filters", icon: Sparkles, key: "F" },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal, key: "A" },
  { id: "crop", label: "Crop", icon: Crop, key: "C" },
  { id: "text", label: "Text", icon: Type, key: "T" },
  { id: "elements", label: "Elements", icon: Shapes, key: "E" },
  { id: "blur", label: "Blur", icon: Droplets, key: "B" },
  { id: "bulk", label: "Bulk", icon: Images, key: "M" },
];

/** Where new stickers land, so they don't pile up under the centred headline. */
const SPOTS = [
  [0.78, 0.2],
  [0.22, 0.2],
  [0.78, 0.8],
  [0.22, 0.8],
  [0.5, 0.18],
] as const;

const DEFAULT_TEXT: Record<TextStyleId, string> = {
  headline: "Grand opening",
  subheading: "This Saturday, 10am",
  sinhala: "සුබ අලුත් අවුරුද්දක් වේවා",
  body: "Add your details here",
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,video/x-m4v,video/*";

export function Editor({ stickers, music: musicLibrary }: { stickers: LibrarySticker[]; music: LibraryTrack[] }) {
  const { state, update, reset, undo, redo, canUndo, canRedo } = useHistory(DEFAULT_STATE);
  /** False until a size is picked on the start screen. */
  const [started, setStarted] = useState(false);
  /** Which start-screen step to open on, and a pending "new post" waiting for confirmation. */
  const [startStep, setStartStep] = useState<StartStep>("media");
  const [pendingNew, setPendingNew] = useState<StartStep | null>(null);
  /** Original files behind uploads, kept so auto-save can store them. */
  const files = useRef(new Map<string, Blob>());
  /** Photos queued for bulk editing with the current design. */
  const [bulkPhotos, setBulkPhotos] = useState<BulkPhoto[]>([]);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const autosave = useAutosave();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [resume, setResume] = useState<DraftSummary | null>(null);
  const [tool, setTool] = useState<ToolId>("photo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Decoded images for the photo and uploaded stickers, keyed by id. Kept out of history. */
  const [photos, setPhotos] = useState<Assets>({});
  const [regionDefaults, setRegionDefaults] = useState<RegionDefaults>({ kind: "blur", shape: "rect", strength: 60 });
  const stickerFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const musicFileRef = useRef<HTMLInputElement>(null);
  /** Loaded music, keyed by track id (library URL or upload id). */
  const [tracks, setTracks] = useState<Record<string, HTMLAudioElement>>({});
  /** Loaded clips, keyed by id like photos. */
  const [videos, setVideos] = useState<Record<string, HTMLVideoElement>>({});
  /** Fires once per video frame so the canvas can redraw without re-rendering React. */
  const clock = useMemo(() => new EventTarget(), []);
  const [startedBlank, setStartedBlank] = useState(false);
  const [fontsVersion, setFontsVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Set when the text field should take focus after the next commit. */
  const pendingFocus = useRef<"focus" | "select" | null>(null);

  const photo = state.photoId ? photos[state.photoId] : undefined;
  const video = state.media === "video" && state.video ? videos[state.video.id] : undefined;
  const musicEl = state.media === "video" && state.music ? tracks[state.music.id] : undefined;
  const { rotation, flipX, flipY } = state.orientation;
  const photoSource = useMemo(
    () => (photo ? orientImage(photo, { rotation, flipX, flipY }) : null),
    [photo, rotation, flipX, flipY],
  );
  // For reels the "photo" is a canvas holding the current video frame, so every tool works unchanged.
  const frame = useMemo(
    () => (video ? createFrameCanvas(video, { rotation, flipX, flipY }) : null),
    [video, rotation, flipX, flipY],
  );
  const source = state.media === "video" ? frame : photoSource;
  /** The reel's playback time, read by the stage on every frame. */
  const getTime = useCallback(() => video?.currentTime ?? 0, [video]);

  /** New text and icons default to white with a shadow when they sit on a photo or video. */
  const hasPicture = !!source;
  // On a plain background, pick dark or light so new items are visible straight away.
  const bgMid = state.background.kind === "gradient" ? mix(state.background.from, state.background.to) : state.background.from;
  const defaultInk = hasPicture || inkFor(bgMid) === "light" ? "#ffffff" : "#111111";

  // Copy each new video frame into the frame canvas and tell the stage to redraw.
  const trim = useRef({ start: 0, end: 0 });
  useEffect(() => {
    trim.current = { start: state.video?.trimStart ?? 0, end: state.video?.trimEnd ?? 0 };
  });
  useEffect(() => {
    if (!video || !frame) return;
    const o = { rotation, flipX, flipY };
    const tick = () => {
      paintFrame(frame, video, o);
      clock.dispatchEvent(new Event("frame"));
    };
    // Preview loops inside the trim. Export turns looping off, which also switches this off.
    const keepInTrim = () => {
      if (video.loop && video.currentTime >= trim.current.end) video.currentTime = trim.current.start;
    };
    const stop = onEachFrame(video, () => {
      keepInTrim();
      tick();
    });
    video.addEventListener("seeked", tick);
    video.addEventListener("timeupdate", keepInTrim);
    tick();
    return () => {
      stop();
      video.removeEventListener("seeked", tick);
      video.removeEventListener("timeupdate", keepInTrim);
    };
  }, [video, frame, clock, rotation, flipX, flipY]);

  // Selection can point at a layer that undo just removed.
  const selectedKind = state.texts.some((t) => t.id === selectedId)
    ? "text"
    : state.stickers.some((t) => t.id === selectedId)
      ? "sticker"
      : state.regions.some((t) => t.id === selectedId)
        ? "region"
        : null;
  const selected = selectedKind ? selectedId : null;

  // Redraw once the typefaces used on the post have arrived.
  const fontKey =
    state.texts.map((t) => `${t.fontFamily}:${t.fontWeight}:${SINHALA_RE.test(t.text)}`).join("|");
  useEffect(() => {
    let alive = true;
    ensureFonts(state).then(() => alive && setFontsVersion((v) => v + 1));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  // Preview sound: the clip's volume, and background music kept in step with the video.
  useEffect(() => {
    if (!video || !state.video) return;
    applyClipVolume(video, state.video);
    if (!musicEl || !state.music) return;
    const clip = state.video;
    const track = state.music;
    const sync = () => {
      setMediaMuted(musicEl, video.muted);
      syncMusic(musicEl, track, clip, video);
    };
    const events = ["play", "pause", "seeked", "timeupdate", "volumechange"] as const;
    events.forEach((e) => video.addEventListener(e, sync));
    sync();
    return () => {
      events.forEach((e) => video.removeEventListener(e, sync));
      musicEl.pause();
    };
  }, [video, musicEl, state.video, state.music]);

  /** Add a track and fit it to the reel. */
  const addTrack = async (id: string, name: string, src: string) => {
    try {
      const el = tracks[id] ?? (await loadAudio(src));
      if (!tracks[id]) setTracks((m) => ({ ...m, [id]: el }));
      update((s) => ({
        ...s,
        music: { id, name, src, duration: el.duration, offset: 0, volume: 80, on: true, loop: true, fade: true },
      }));
      const reel = state.video ? state.video.trimEnd - state.video.trimStart : 0;
      if (reel) {
        toast.success(`${name} added`, {
          description:
            el.duration >= reel
              ? `Cut to your ${formatTime(reel)} reel.`
              : `It's ${formatTime(el.duration)} long, so it loops to fill your ${formatTime(reel)} reel.`,
        });
      }
    } catch (err) {
      toast.error("This music couldn't be loaded", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const loadMusicFile = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("That file isn't audio", { description: "Choose an MP3, M4A or WAV file." });
      return;
    }
    const id = crypto.randomUUID();
    files.current.set(id, file);
    void addTrack(id, file.name.replace(/\.[^.]+$/, ""), URL.createObjectURL(file));
  };

  const loadVideoFile = useCallback(
    async (file: File) => {
      try {
        const v = await loadVideo(file);
        const id = crypto.randomUUID();
        files.current.set(id, file);
        setVideos((m) => ({ ...m, [id]: v }));
        update((s) => ({
          ...s,
          video: {
            id,
            name: file.name,
            duration: v.duration,
            trimStart: 0,
            trimEnd: Math.min(v.duration, 90),
            audio: true,
            volume: 100,
          },
          custom: fitExport(v.videoWidth, v.videoHeight),
          crop: null,
          orientation: { rotation: 0, flipX: false, flipY: false },
        }));
        if (v.duration > 90) {
          toast("Trimmed to the first 90 seconds", { description: "Facebook reels can be up to 90 seconds. Adjust it under Video." });
        }
      } catch (err) {
        toast.error("This video couldn't be opened", { description: err instanceof Error ? err.message : undefined });
      }
    },
    [update],
  );

  const pickPhoto = () => (state.media === "video" ? videoFileRef : fileRef).current?.click();

  const addSticker = (n: NewSticker, assets: Assets = photos) => {
    const count = state.stickers.length;
    const base = n.kind === "image" ? 360 : n.kind === "emoji" ? 200 : 180;
    let size = base;
    const img = n.kind === "image" ? assets[n.value] : null;
    // Keep tall uploads inside the post.
    if (img && img.height > img.width) size = Math.round(base * (img.width / img.height));
    const sticker: Sticker = {
      id: crypto.randomUUID(),
      x: SPOTS[count % SPOTS.length][0],
      y: SPOTS[count % SPOTS.length][1],
      size,
      rotation: 0,
      color: defaultInk,
      opacity: 100,
      z: nextZ(state),
      ...n,
    };
    update((s) => ({ ...s, stickers: [...s.stickers, sticker] }));
    setSelectedId(sticker.id);
    setStartedBlank(true);
    setTool("elements");
  };

  const loadSticker = (file: File) => {
    // SVGs can pull in outside resources, which taints the canvas and blocks export.
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      toast.error("That file isn't an image", { description: "Choose a PNG, JPG or WebP image." });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const id = crypto.randomUUID();
      files.current.set(id, file);
      const next = { ...photos, [id]: img };
      setPhotos(next);
      addSticker({ kind: "image", value: id }, next);
    };
    img.onerror = () => toast.error("This image couldn't be opened", { description: "Try saving it as PNG or JPG." });
    img.src = URL.createObjectURL(file);
  };


  /** Stickers from /public/custom_icons load on first use and are then kept with the other images. */
  const addCustomSticker = (id: string, src: string) => {
    if (photos[id]) {
      addSticker({ kind: "image", value: id });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const next = { ...photos, [id]: img };
      setPhotos(next);
      addSticker({ kind: "image", value: id }, next);
    };
    img.onerror = () => toast.error("This sticker couldn't be loaded", { description: "Check your connection and try again." });
    img.src = src;
  };

  const loadFile = (file: File) => {
    if (state.media === "video") {
      if (file.type.startsWith("video/")) return void loadVideoFile(file);
      // Dropped images in a reel become stickers.
      if (file.type.startsWith("image/")) return void loadSticker(file);
      toast.error("That file isn't a video", { description: "Choose an MP4 or WebM clip." });
      return;
    }
    if (file.type.startsWith("video/")) {
      toast.error("Videos go in a reel", { description: "Start a new reel from the home screen (click the Bubble Studio logo)." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("That file isn't an image", { description: "Choose a JPG, PNG or WebP photo." });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const id = crypto.randomUUID();
      files.current.set(id, file);
      setPhotos((p) => ({ ...p, [id]: img }));
      update((s) => ({
        ...s,
        photoId: id,
        photoName: file.name,
        custom: fitExport(img.naturalWidth, img.naturalHeight),
        crop: null,
        orientation: { rotation: 0, flipX: false, flipY: false },
      }));
      setTool((t) => (t === "photo" ? "filters" : t));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("This photo couldn't be opened", {
        description: "Your browser may not support this format. Try saving it as JPG or PNG.",
      });
    };
    img.src = url;
  };


  const setOrientation = (o: Orientation) =>
    update((s) => {
      // A quarter turn swaps the upload's width and height, which "original" size follows.
      const turned = (s.orientation.rotation - o.rotation) % 180 !== 0;
      const custom = turned && s.custom ? { w: s.custom.h, h: s.custom.w } : s.custom;
      return { ...s, orientation: o, crop: null, custom };
    });

  const addText = (style: TextStyleId, text?: string) => {
    const st = TEXT_STYLES[style];
    const offset = state.texts.length * 0.06;
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: text ?? DEFAULT_TEXT[style],
      x: 0.5,
      y: Math.min(0.85, (style === "headline" ? 0.42 : style === "body" ? 0.7 : 0.58) + offset),
      fontFamily: st.fontFamily,
      fontWeight: st.fontWeight,
      fontSize: st.fontSize,
      color: defaultInk,
      align: "center",
      uppercase: st.uppercase,
      letterSpacing: st.letterSpacing,
      lineHeight: st.lineHeight,
      width: st.width,
      shadow: hasPicture,
      fill: DEFAULT_FILL,
      rotation: 0,
      z: nextZ(state),
    };
    update((s) => ({ ...s, texts: [...s.texts, layer] }));
    setSelectedId(layer.id);
    setTool("text");
    pendingFocus.current = "select";
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!pendingFocus.current || !el) return;
    el.focus();
    if (pendingFocus.current === "select") el.select();
    pendingFocus.current = null;
  });

  /** Select from the canvas and bring up the matching panel. */
  const selectLayer = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    if (state.texts.some((t) => t.id === id)) setTool("text");
    else if (state.stickers.some((t) => t.id === id)) setTool("elements");
    else if (state.regions.some((t) => t.id === id)) setTool("blur");
  };

  // Keyboard: undo/redo, delete, nudge, tool keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.closest("input, textarea, select, [contenteditable=true]");
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "]" || e.key === "[") && selected && selectedKind !== "region") {
        e.preventDefault();
        const to = e.key === "]" ? (e.shiftKey ? "top" : 1) : e.shiftKey ? "bottom" : -1;
        update((s) => restack(s, selected, to));
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        if (typing) return;
        e.preventDefault();
        redo();
        return;
      }
      if (typing || mod) return;
      // Blur areas: arrows move, Alt + arrows resize, Shift for bigger steps.
      if (selected && selectedKind === "region" && e.key.startsWith("Arrow")) {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!d) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.02 : 0.004;
        update(
          (s) => ({
            ...s,
            regions: s.regions.map((r) => {
              if (r.id !== selected) return r;
              if (e.altKey) {
                const w = Math.min(1 - r.x, Math.max(0.02, r.w + d[0] * step));
                const h = Math.min(1 - r.y, Math.max(0.02, r.h + d[1] * step));
                return { ...r, w, h };
              }
              return {
                ...r,
                x: Math.min(1 - r.w, Math.max(0, r.x + d[0] * step)),
                y: Math.min(1 - r.h, Math.max(0, r.y + d[1] * step)),
              };
            }),
          }),
          `${e.altKey ? "resize" : "nudge"}:${selected}`,
        );
        return;
      }
      if (e.altKey) return;
      if (selected && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        update((s) => ({
          ...s,
          texts: s.texts.filter((t) => t.id !== selected),
          stickers: s.stickers.filter((t) => t.id !== selected),
          regions: s.regions.filter((t) => t.id !== selected),
        }));
        setSelectedId(null);
        return;
      }
      if (selected && selectedKind !== "region" && e.key.startsWith("Arrow") && !el.closest("[role=slider]")) {
        e.preventDefault();
        const step = e.shiftKey ? 0.02 : 0.004;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        const nudge = <T extends { id: string; x: number; y: number }>(t: T): T =>
          t.id === selected ? { ...t, x: Math.min(1, Math.max(0, t.x + d[0])), y: Math.min(1, Math.max(0, t.y + d[1])) } : t;
        update(
          (s) => ({ ...s, texts: s.texts.map(nudge), stickers: s.stickers.map(nudge) }),
          `nudge:${selected}`,
        );
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (t && !(t.id === "bulk" && state.media === "video") && !el.closest("[role=radiogroup], [role=listbox]")) setTool(t.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, selectedKind, undo, redo, update, state.media]);

  const showEmpty =
    state.media === "video"
      ? !state.video
      : !state.photoId && state.texts.length === 0 && state.stickers.length === 0 && !startedBlank;

  // Auto-save: shortly after each change, store the design and the files it uses in this browser.
  useEffect(() => {
    if (!started || !autosave) return;
    const timer = window.setTimeout(async () => {
      setSaveStatus("saving");
      try {
        // Very large uploads are skipped; on resume the user is asked to add them again.
        const small = new Map([...files.current].filter(([, blob]) => blob.size <= MAX_SAVED_FILE));
        await saveDraft(buildDraft(state), small);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, started, autosave]);

  // Offer to continue the saved post on the start screen.
  useEffect(() => {
    if (started) return;
    let alive = true;
    void peekDraft().then((d) => alive && setResume(d));
    return () => {
      alive = false;
    };
  }, [started, autosave]);

  /** Rebuild the saved post: its design plus every photo, video, sticker and track it used. */
  const resumeDraft = async () => {
    try {
      const saved = await loadDraft();
      if (!saved) {
        toast.error("There's no saved post to continue");
        return;
      }
      const { draft, files: stored } = saved;
      let next = draft.state;
      const nextPhotos: Assets = {};
      const nextVideos: Record<string, HTMLVideoElement> = {};
      const nextTracks: Record<string, HTMLAudioElement> = {};
      const imageFrom = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const missing: string[] = [];

      if (next.photoId) {
        const blob = stored.get(next.photoId);
        if (blob) nextPhotos[next.photoId] = await imageFrom(URL.createObjectURL(blob));
        else missing.push("photo");
      }
      for (const s of next.stickers) {
        if (s.kind !== "image" || nextPhotos[s.value]) continue;
        const blob = stored.get(s.value);
        const library = stickers.find((l) => l.id === s.value);
        const src = blob ? URL.createObjectURL(blob) : library?.src;
        if (src) nextPhotos[s.value] = await imageFrom(src).catch(() => undefined as unknown as HTMLImageElement);
      }
      if (next.video) {
        const blob = stored.get(next.video.id);
        if (blob) nextVideos[next.video.id] = await loadVideo(blob);
        else missing.push("video");
      }
      if (next.music) {
        const blob = stored.get(next.music.id);
        const src = blob ? URL.createObjectURL(blob) : next.music.src.startsWith("/") ? next.music.src : null;
        if (src) {
          nextTracks[next.music.id] = await loadAudio(src);
          next = { ...next, music: { ...next.music, src } };
        } else {
          next = { ...next, music: null };
          missing.push("music");
        }
      }

      for (const [id, blob] of stored) files.current.set(id, blob);
      setPhotos(nextPhotos);
      setVideos(nextVideos);
      setTracks(nextTracks);
      reset(next);
      setSelectedId(null);
      setTool("photo");
      setStartedBlank(true);
      setStarted(true);
      if (missing.length) {
        toast("Some files weren't saved", { description: `Add the ${missing.join(" and ")} again.` });
      }
    } catch {
      toast.error("The saved post couldn't be opened", { description: "Your browser may have cleared its storage." });
    }
  };

  const toggleAutosave = (on: boolean) => {
    setAutosave(on);
    if (on) {
      toast.success("Auto-save is on", { description: "Your last post is kept in this browser only." });
    } else {
      void deleteDraft();
      setSaveStatus("idle");
      toast("Auto-save is off", { description: "The saved post was deleted from this browser." });
    }
  };

  /** Load several photos for bulk editing; the photo already in the design joins them first. */
  const addBulkPhotos = async (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith("image/"));
    if (images.length < list.length) toast("Some files were skipped", { description: "Only JPG, PNG and WebP photos can be added." });
    const loaded = await Promise.all(
      images.map(
        (file) =>
          new Promise<BulkPhoto | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, img, file });
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
          }),
      ),
    );
    const fresh = loaded.filter((p): p is BulkPhoto => !!p);
    setBulkPhotos((current) => {
      const start = [...current];
      const mainBlob = state.photoId ? files.current.get(state.photoId) : undefined;
      if (current.length === 0 && state.photoId && photos[state.photoId] && mainBlob) {
        start.push({ id: state.photoId, name: state.photoName ?? "photo", img: photos[state.photoId], file: mainBlob });
      }
      return [...start, ...fresh];
    });
    if (fresh.length) toast.success(`${fresh.length} photo${fresh.length === 1 ? "" : "s"} added`);
  };

  /** Make a bulk photo the one shown in the editor, to fine-tune the design on it. */
  const openBulkPhoto = (p: BulkPhoto) => {
    files.current.set(p.id, p.file);
    setPhotos((m) => ({ ...m, [p.id]: p.img }));
    update((s) => ({
      ...s,
      photoId: p.id,
      photoName: p.name,
      crop: null,
      orientation: { rotation: 0, flipX: false, flipY: false },
      custom: fitExport(p.img.naturalWidth, p.img.naturalHeight),
    }));
  };

  /** Clear the editor and go back to the start screen, at the given step. */
  const startNew = (step: StartStep) => {
    for (const v of Object.values(videos)) {
      v.pause();
      v.remove();
    }
    for (const a of Object.values(tracks)) a.pause();
    setVideos({});
    setBulkPhotos([]);
    setSelectedId(null);
    setTool("photo");
    setStartedBlank(false);
    setStartStep(step);
    setPendingNew(null);
    setStarted(false);
  };

  /** Ask first when there's something on the post that would be lost. */
  const requestNew = (step: StartStep) => {
    const hasWork = state.photoId || state.video || state.music || state.texts.length || state.stickers.length || state.regions.length;
    if (hasWork) setPendingNew(step);
    else startNew(step);
  };

  // The photo keeps its framing relative to the new shape only roughly, so reset the crop.
  const setSize = (size: PostSizeId) =>
    update((s) => {
      if (s.size === size) return s;
      const next = {
        ...s,
        size,
        crop: null,
        custom: size === "original" && source ? fitExport(source.width, source.height) : s.custom,
      };
      if (!source || s.regions.length === 0) return next;
      // Regions are stored relative to the post; carry them through photo pixels into the new frame.
      const from = s.crop ?? defaultCrop(source.width, source.height, postDims(s).aspect);
      const toAspect = postDims(next).aspect;
      const to = defaultCrop(source.width, source.height, toAspect);
      const fromH = from.size / postDims(s).aspect;
      const toH = to.size / toAspect;
      const regions = s.regions.map((r) => {
        const px = from.x + r.x * from.size;
        const py = from.y + r.y * fromH;
        const x = (px - to.x) / to.size;
        const y = (py - to.y) / toH;
        const w = (r.w * from.size) / to.size;
        const h = (r.h * fromH) / toH;
        return { ...r, x, y, w, h };
      });
      return { ...next, regions };
    });

  if (!started) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-rule bg-sheet px-3 md:px-4">
          <BrandMark />
          <span className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink">Bubble Studio</span>
          <span className="ml-auto">
            <DesktopUpdates />
          </span>
        </header>
        <StartScreen
          key={startStep}
          initialStep={startStep}
          resume={resume}
          onResume={resumeDraft}
          onPick={(media, size) => {
            reset({ ...DEFAULT_STATE, media, size });
            setStarted(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        source={source}
        assets={photos}
        state={state}
        onSize={setSize}
        onHome={() => requestNew("media")}
        onNew={requestNew}
        autosave={
          <AutosaveMenu on={autosave} status={saveStatus} onToggle={toggleAutosave} />
        }
        video={video}
        frame={frame}
        music={musicEl}
        getVideoFile={() => (state.video ? files.current.get(state.video.id) : undefined)}
        layers={
          <LayersMenu
            state={state}
            assets={photos}
            selectedId={selected}
            onSelect={selectLayer}
            onSelectPhoto={() => {
              setSelectedId(null);
              setTool("photo");
            }}
            onRestack={(id, dir) => update((s) => restack(s, id, dir))}
            onDelete={(id) => {
              update((s) => ({
                ...s,
                texts: s.texts.filter((t) => t.id !== id),
                stickers: s.stickers.filter((t) => t.id !== id),
                regions: s.regions.filter((t) => t.id !== id),
              }));
              if (id === selectedId) setSelectedId(null);
            }}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ToolRail tool={tool} onTool={setTool} media={state.media} />

        <main className="flex h-[min(56vh,460px)] min-w-0 shrink-0 flex-col pt-3 md:h-auto md:min-h-0 md:flex-1 md:pt-4" aria-label="Canvas">
          <CanvasStage
            source={source}
            assets={photos}
            state={state}
            tool={tool}
            selectedId={selected}
            fontsVersion={fontsVersion}
            showEmpty={showEmpty}
            clock={clock}
            getTime={state.media === "video" && video ? getTime : undefined}
            regionDefaults={regionDefaults}
            onSelect={selectLayer}
            onTextChange={(id, patch, key) =>
              update((s) => ({ ...s, texts: s.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }), key)
            }
            onStickerChange={(id, patch, key) =>
              update((s) => ({ ...s, stickers: s.stickers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }), key)
            }
            onRegions={(fn, key) => update((s) => ({ ...s, regions: fn(s.regions) }), key)}
            onCropChange={(crop, key) => update((s) => ({ ...s, crop }), key)}
            onPickPhoto={pickPhoto}
            onStartBlank={() => {
              setStartedBlank(true);
              setTool("photo");
            }}
            onDropFile={loadFile}
          />
          {video && state.video && (
            <>
              <VideoBar video={video} clip={state.video} />
              <Timeline
                state={state}
                video={video}
                clip={state.video}
                selectedId={selected}
                onSelect={selectLayer}
                onTiming={(id, timing) =>
                  update(
                    (s) => ({
                      ...s,
                      texts: s.texts.map((t) => (t.id === id ? { ...t, ...timing } : t)),
                      stickers: s.stickers.map((t) => (t.id === id ? { ...t, ...timing } : t)),
                    }),
                    `timing:${id}`,
                  )
                }
              />
            </>
          )}
        </main>

        <aside
          className="min-h-0 flex-1 overflow-y-auto border-t border-rule bg-sheet md:w-[320px] md:flex-none md:shrink-0 md:border-t-0 md:border-l"
          aria-label={`${TOOLS.find((t) => t.id === tool)?.label} settings`}
        >
          {tool === "photo" && state.media === "video" && (
            <VideoPanel
              state={state}
              update={update}
              video={video}
              onPickVideo={pickPhoto}
              onRemoveVideo={() => {
                video?.pause();
                update((s) => ({ ...s, video: null, crop: null }));
              }}
              musicLibrary={musicLibrary}
              onPickMusic={(t) => void addTrack(t.id, t.name, t.src)}
              onUploadMusic={() => musicFileRef.current?.click()}
            />
          )}
          {tool === "photo" && state.media === "photo" && (
            <PhotoPanel
              state={state}
              update={update}
              onPickPhoto={pickPhoto}
              onRemovePhoto={() => update((s) => ({ ...s, photoId: null, photoName: null, crop: null }))}
            />
          )}
          {tool === "filters" && <FiltersPanel source={source} state={state} update={update} />}
          {tool === "adjust" && <AdjustPanel source={source} state={state} update={update} />}
          {tool === "crop" && <CropPanel source={source} state={state} update={update} onOrient={setOrientation} />}
          {tool === "text" && (
            <TextPanel
              state={state}
              update={update}
              selectedId={selected}
              onSelect={setSelectedId}
              onAdd={addText}
              textareaRef={textareaRef}
            />
          )}
          {tool === "elements" && (
            <ElementsPanel
              state={state}
              update={update}
              assets={photos}
              selectedId={selected}
              onSelect={setSelectedId}
              onAdd={addSticker}
              onAddCustom={addCustomSticker}
              library={stickers}
              onUpload={() => stickerFileRef.current?.click()}
            />
          )}
          {tool === "bulk" && (
            <BulkPanel
              state={state}
              assets={photos}
              photos={bulkPhotos}
              onAdd={() => bulkFileRef.current?.click()}
              onRemove={(id) => setBulkPhotos((list) => list.filter((p) => p.id !== id))}
              onOpen={openBulkPhoto}
              onClear={() => setBulkPhotos([])}
            />
          )}
          {tool === "blur" && (
            <BlurPanel
              state={state}
              update={update}
              selectedId={selected}
              onSelect={setSelectedId}
              defaults={regionDefaults}
              onDefaults={setRegionDefaults}
            />
          )}
        </aside>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadFile(f);
          e.target.value = "";
        }}
      />
      <AlertDialog open={pendingNew !== null} onOpenChange={(open) => !open && setPendingNew(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new {pendingNew === "reel" ? "reel" : "post"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current design will be cleared and can&apos;t be brought back. Export it first if you want to keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand text-white hover:bg-brand-ink"
              onClick={() => pendingNew && startNew(pendingNew)}
            >
              Start new
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={bulkFileRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) void addBulkPhotos(list);
          e.target.value = "";
        }}
      />
      <input
        ref={musicFileRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadMusicFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={videoFileRef}
        type="file"
        accept={ACCEPT_VIDEO}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadVideoFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={stickerFileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadSticker(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ToolRail({ tool, onTool, media }: { tool: ToolId; onTool: (t: ToolId) => void; media: "photo" | "video" }) {
  return (
    <nav
      aria-label="Tools"
      className="order-last flex shrink-0 justify-around border-t border-rule bg-sheet px-1 py-1 md:order-first md:w-[76px] md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:px-2 md:py-3"
    >
      {TOOLS.filter((t) => media === "photo" || t.id !== "bulk").map((tool_) => {
        // In a reel the first tool holds the video instead of a photo.
        const t = media === "video" && tool_.id === "photo" ? { ...tool_, label: "Video", icon: Film } : tool_;
        const active = t.id === tool;
        const Icon = t.icon;
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onTool(t.id)}
                  className={cn(
                    "group relative flex h-14 min-w-11 flex-col md:min-w-14 items-center justify-center gap-1 rounded-md text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                    active ? "bg-aqua-wash text-aqua-ink" : "text-ink-soft hover:bg-muted hover:text-ink",
                  )}
                />
              }
            >
              <Icon className="size-5" strokeWidth={active ? 2.1 : 1.75} />
              {t.label}
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden md:inline-flex">
              {t.label} <kbd className="font-mono text-[10px] opacity-70">{t.key}</kbd>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function TopBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  source,
  assets,
  state,
  onSize,
  onHome,
  onNew,
  autosave,
  video,
  frame,
  music,
  getVideoFile,
  layers,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  source: ReturnType<typeof orientImage> | null;
  assets: Assets;
  state: typeof DEFAULT_STATE;
  onSize: (size: PostSizeId) => void;
  onHome: () => void;
  onNew: (step: StartStep) => void;
  autosave: React.ReactNode;
  video: HTMLVideoElement | undefined;
  frame: HTMLCanvasElement | null;
  music: HTMLAudioElement | undefined;
  getVideoFile: () => Blob | undefined;
  layers: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-sheet px-3 md:px-4">
      <button
        type="button"
        onClick={onHome}
        title="Start something new"
        className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-aqua"
      >
        <BrandMark />
        <span className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink">Bubble Studio</span>
      </button>
      <span className="hidden h-5 w-px bg-rule sm:block" aria-hidden />
      <SizeMenu
        value={state.size}
        custom={state.custom}
        options={state.media === "video" ? ["story", "original"] : ["square", "portrait", "landscape", "story", "original"]}
        reel={state.media === "video"}
        onChange={onSize}
      />

      <div className="ml-auto flex items-center gap-1">
        <DesktopUpdates />
        {autosave}
        <NewMenu onNew={onNew} />
        {layers}
        <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={onUndo} />}>
            <Undo2 />
          </TooltipTrigger>
          <TooltipContent>Undo <kbd className="font-mono text-[10px] opacity-70">Ctrl Z</kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={onRedo} />}>
            <Redo2 />
          </TooltipTrigger>
          <TooltipContent>Redo <kbd className="font-mono text-[10px] opacity-70">Ctrl Shift Z</kbd></TooltipContent>
        </Tooltip>
        <span className="mx-1.5 h-5 w-px bg-rule" aria-hidden />
        {state.media === "video" ? (
          <ReelExportButton
            video={video}
            frame={frame}
            music={music}
            assets={assets}
            state={state}
            getVideoFile={getVideoFile}
          />
        ) : (
          <ExportButton source={source} assets={assets} state={state} />
        )}
      </div>
    </header>
  );
}

function ExportButton({
  source,
  assets,
  state,
}: {
  source: ReturnType<typeof orientImage> | null;
  assets: Assets;
  state: typeof DEFAULT_STATE;
}) {
  const [format, setFormat] = useState<"png" | "jpeg">("jpeg");
  const [quality, setQuality] = useState(92);
  const [name, setName] = useState("facebook-post");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const blob = await exportPost(source, assets, state, format, quality);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "facebook-post";
      a.href = url;
      a.download = `${base}.${format === "jpeg" ? "jpg" : "png"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setOpen(false);
      toast.success("Post downloaded", { description: `${a.download} · ${formatBytes(blob.size)}` });
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button className="bg-brand px-3 text-white hover:bg-brand-ink" />}>
        <Download /> Export
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Export post</h2>
          <p className="mt-0.5 font-mono text-xs text-ink-soft tabular">
            {exportDims(state).w} × {exportDims(state).h} px · {POST_SIZES[state.size].label.toLowerCase()}
          </p>
        </div>
        <div className="grid gap-4 px-4 py-4">
          <div className="grid gap-2">
            <span className="text-[13px] text-ink-soft">Format</span>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[format]}
              onValueChange={(v) => v[0] && setFormat(v[0] as "png" | "jpeg")}
              className="w-full"
            >
              <ToggleGroupItem value="jpeg" className="flex-1">JPG</ToggleGroupItem>
              <ToggleGroupItem value="png" className="flex-1">PNG</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-pretty text-ink-soft">
              {format === "jpeg"
                ? "Smaller file. Best for photos."
                : "Larger file with no compression. Best for text-heavy posts and logos."}
            </p>
          </div>
          {format === "jpeg" && (
            <RangeField label="Quality" value={quality} min={60} max={100} format={(v) => `${v}%`} onChange={setQuality} />
          )}
          <div className="grid gap-2">
            <label htmlFor="export-name" className="text-[13px] text-ink-soft">File name</label>
            <div className="flex items-center gap-1.5">
              <Input id="export-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-sheet" />
              <span className="font-mono text-xs text-ink-soft">.{format === "jpeg" ? "jpg" : "png"}</span>
            </div>
          </div>
          <Button onClick={download} disabled={busy} className="h-9 bg-brand text-white hover:bg-brand-ink">
            <Download /> {busy ? "Preparing…" : `Download ${format === "jpeg" ? "JPG" : "PNG"}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReelExportButton({
  video,
  frame,
  music,
  assets,
  state,
  getVideoFile,
}: {
  video: HTMLVideoElement | undefined;
  frame: HTMLCanvasElement | null;
  music: HTMLAudioElement | undefined;
  assets: Assets;
  state: typeof DEFAULT_STATE;
  /** The original clip file; with it the reel can be encoded frame by frame instead of recorded. */
  getVideoFile: () => Blob | undefined;
}) {
  const fast = useMemo(() => canFastExport(), []);
  const [name, setName] = useState("facebook-reel");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const format = useMemo(() => (typeof window === "undefined" ? null : reelFormat()), []);
  const clip = state.video;
  const busy = progress !== null;
  const length = clip ? clip.trimEnd - clip.trimStart : 0;

  const fileBase = () => name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "facebook-reel";
  const save = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const record = async () => {
    if (!video || !frame || !clip) return;
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setProgress(0);
    const realtime = () =>
      exportReel({ video, frame, orientation: state.orientation, assets, state, music, onProgress: setProgress, signal });
    try {
      const file = getVideoFile();
      let result: { blob: Blob; ext: string };
      let note: string | null = null;
      if (fast && file) {
        try {
          const started = performance.now();
          result = await fastExportReel({ file, orientation: state.orientation, assets, state, onProgress: setProgress, signal });
          const seconds = (performance.now() - started) / 1000;
          if (seconds < length) note = (`Exported in ${seconds.toFixed(1)} s, ${Math.max(1, Math.round(length / seconds))}× faster than real time.`);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          toast("Using real-time recording", { description: err instanceof Error ? err.message : undefined });
          setProgress(0);
          result = await realtime();
        }
      } else {
        result = await realtime();
      }
      const { blob, ext } = result;
      const filename = `${fileBase()}.${ext}`;
      save(blob, filename);
      setOpen(false);
      toast.success("Reel downloaded", { description: `${filename} · ${formatBytes(blob.size)}` });
      if (note) toast(note);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") toast("Export cancelled");
      else toast.error("Export failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  const saveFrame = async () => {
    const blob = await exportPost(frame, assets, state, "jpeg", 92, video?.currentTime);
    save(blob, `${fileBase()}-frame.jpg`);
    toast.success("Frame saved", { description: formatBytes(blob.size) });
  };

  return (
    <Popover open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <PopoverTrigger render={<Button className="bg-brand px-3 text-white hover:bg-brand-ink" />}>
        <Download /> Export
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Export reel</h2>
          <p className="mt-0.5 font-mono text-xs text-ink-soft tabular">
            {exportDims(state).w} × {exportDims(state).h} · {formatTime(length)} · {format?.label ?? "video"}
          </p>
        </div>
        {!clip ? (
          <p className="px-4 py-4 text-sm text-pretty text-ink-soft">Add a video first, then come back to export.</p>
        ) : !format ? (
          <p className="px-4 py-4 text-sm text-pretty text-ink-soft">
            This browser can&apos;t record video. Open Bubble Studio in the latest Chrome, Edge or Safari to export reels.
          </p>
        ) : (
          <div className="grid gap-4 px-4 py-4">
            <p className="text-xs text-pretty text-ink-soft">
              {fast
                ? "Fast export: the reel is built frame by frame, usually several times faster than its length. "
                : `Recording plays your clip once in real time, so it takes about ${Math.ceil(length)} seconds. Keep this window open. `}
              {soundSummary(state)}
              {!fast && format.ext === "webm" && " This browser saves WebM; Facebook accepts it."}
            </p>
            <div className="grid gap-2">
              <label htmlFor="reel-name" className="text-[13px] text-ink-soft">File name</label>
              <div className="flex items-center gap-1.5">
                <Input id="reel-name" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} className="bg-sheet" />
                <span className="font-mono text-xs text-ink-soft">.{format.ext}</span>
              </div>
            </div>
            {busy ? (
              <div className="grid gap-2" role="status" aria-live="polite">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-ink">Recording…</span>
                  <span className="font-mono text-xs text-ink-soft tabular">{Math.round((progress ?? 0) * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${(progress ?? 0) * 100}%` }} />
                </div>
                <Button variant="outline" onClick={() => abort.current?.abort()}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button onClick={record} className="h-9 bg-brand text-white hover:bg-brand-ink">
                  <Film /> Export {format.label}
                </Button>
                <Button variant="ghost" size="sm" onClick={saveFrame}>
                  Save this frame as JPG
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Largest upload we copy into browser storage; bigger videos would eat the quota. */
const MAX_SAVED_FILE = 500 * 1024 * 1024;

/** The design plus the list of uploaded files it depends on. */
function buildDraft(state: typeof DEFAULT_STATE): Draft {
  const assets: DraftAsset[] = [];
  if (state.photoId) assets.push({ id: state.photoId, kind: "image" });
  for (const s of state.stickers) {
    if (s.kind === "image" && !s.value.startsWith("custom:")) assets.push({ id: s.value, kind: "image" });
  }
  if (state.video) assets.push({ id: state.video.id, kind: "video", name: state.video.name });
  if (state.music && !state.music.src.startsWith("/")) assets.push({ id: state.music.id, kind: "audio", name: state.music.name });
  return { state, savedAt: Date.now(), thumb: snapshotThumb(), assets };
}

/** A small picture of the post for the "Continue" card. */
function snapshotThumb(): string | null {
  const stage = document.querySelector<HTMLCanvasElement>('canvas[aria-label="Post preview"]');
  if (!stage) return null;
  const w = 240;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round((stage.height / stage.width) * w);
  c.getContext("2d")?.drawImage(stage, 0, 0, c.width, c.height);
  try {
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

/** Top-bar switch and status for keeping the last post in this browser. */
function AutosaveMenu({ on, status, onToggle }: { on: boolean; status: SaveStatus; onToggle: (on: boolean) => void }) {
  const label = !on ? "Not saved" : status === "saving" ? "Saving…" : status === "error" ? "Not saved" : "Saved";
  const Icon = !on ? CloudOff : status === "saving" ? LoaderCircle : status === "error" ? CloudAlert : CloudCheck;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 px-2", on && status !== "error" ? "text-aqua-ink" : "text-ink-soft")}
            aria-label={`Auto-save: ${label}`}
          />
        }
      >
        <Icon className={cn(status === "saving" && on && "animate-spin")} />
        <span className="hidden lg:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1">
        <DropdownMenuCheckboxItem checked={on} onCheckedChange={(v) => onToggle(!!v)} className="items-start py-2">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">Keep my last post in this browser</span>
            <span className="text-[11px] text-pretty text-ink-soft">
              Saves automatically, including your photos and videos, on this computer only. Turning it off deletes the
              saved post.
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        {on && status === "error" && (
          <p className="px-2 pt-1 pb-2 text-[11px] text-pretty text-destructive">
            The last save failed, usually because browser storage is full. Try removing a large video.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "New" in the top bar: start a photo post or a reel without hunting for the way back. */
function NewMenu({ onNew }: { onNew: (step: StartStep) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5 px-2.5" aria-label="Create new" />}>
        <Plus />
        <span className="hidden md:inline">New</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1">
        <DropdownMenuItem onClick={() => onNew("size")} className="gap-3 py-2">
          <ImageIcon className="text-brand" />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-ink">New photo post</span>
            <span className="text-[11px] text-ink-soft">Choose a size, then add a photo</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNew("reel")} className="gap-3 py-2">
          <Film className="text-brand" />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-ink">New video reel</span>
            <span className="text-[11px] text-ink-soft">9:16 or the video&apos;s own size</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function soundSummary(state: typeof DEFAULT_STATE) {
  const original = state.video?.audio && (state.video?.volume ?? 0) > 0;
  const music = state.music?.on && state.music.volume > 0 ? state.music : null;
  if (original && music) return `Sound: the original audio at ${state.video!.volume}% plus ${music.name} at ${music.volume}%.`;
  if (music) return `Sound: ${music.name} at ${music.volume}%, original audio muted.`;
  if (original) return `Sound: the original audio at ${state.video!.volume}%.`;
  return "This reel will be silent.";
}

function SizeMenu({
  value,
  custom,
  options,
  reel,
  onChange,
}: {
  value: PostSizeId;
  custom: { w: number; h: number } | null;
  options: PostSizeId[];
  reel: boolean;
  onChange: (size: PostSizeId) => void;
}) {
  // In a reel the 9:16 preset reads as "Reel"; "Original size" shows the upload's real pixels.
  const describe = (id: PostSizeId) => {
    const s = POST_SIZES[id];
    if (id === "original") {
      return {
        label: s.label,
        ratio: custom ? `${custom.w}×${custom.h}` : "Fit",
        detail: custom ? `${custom.w} × ${custom.h} · same as your ${reel ? "video" : "photo"}` : `Matches your ${reel ? "video" : "photo"}`,
        w: custom?.w ?? 4,
        h: custom?.h ?? 3,
      };
    }
    return { label: reel && id === "story" ? "Reel" : s.label, ratio: s.ratio, detail: `${s.ratio} · ${s.w} × ${s.h}`, w: s.w, h: s.h };
  };
  const current = describe(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2 px-2 text-ink" aria-label={`Post size: ${current.label}`} />}
      >
        {reel && <Film className="text-ink-soft" />}
        <span className="hidden sm:inline">{current.label}</span>
        <span className="font-mono text-xs text-ink-soft tabular">{current.ratio}</span>
        <ChevronDown className="text-ink-soft" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1">
        {options.map((id) => {
          const s = describe(id);
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => onChange(id)}
              className={cn("gap-3 py-2", id === value && "bg-aqua-wash")}
            >
              <span className="grid w-10 shrink-0 place-items-center">
                <SizePreview w={s.w} h={s.h} max={26} dashed={id === "original" && !custom} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-ink">{s.label}</span>
                <span className="font-mono text-[11px] text-ink-soft tabular">{s.detail}</span>
              </span>
              {id === value && <Check className="text-aqua-ink" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/favicon.png" alt="" width={28} height={28} className="size-7 shrink-0 rounded-[7px]" />
  );
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
