import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Conversion,
  Input,
  Mp3OutputFormat,
  Mp4OutputFormat,
  Output,
  VideoSampleSink,
  type VideoSample,
  WavOutputFormat,
  canEncodeAudio,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from "mediabunny";

/* ------------------------------------------------------------ extract audio */

export type AudioFormat = "mp3" | "m4a" | "wav";

export const AUDIO_FORMATS: { id: AudioFormat; label: string; note: string }[] = [
  { id: "mp3", label: "MP3", note: "Plays everywhere" },
  { id: "m4a", label: "M4A", note: "Original quality, fastest" },
  { id: "wav", label: "WAV", note: "Uncompressed, large" },
];

let mp3Ready: Promise<void> | null = null;

/** Browsers can't encode MP3 themselves; load the small MP3 encoder the first time it's needed. */
function ensureMp3() {
  mp3Ready ??= (async () => {
    if (await canEncodeAudio("mp3")) return;
    const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
    registerMp3Encoder();
  })();
  return mp3Ready;
}

/**
 * Pull the sound out of a video file. M4A copies AAC audio without re-encoding when it can,
 * so it's near-instant and lossless; MP3 and WAV re-encode.
 */
export async function extractAudio(
  file: Blob,
  format: AudioFormat,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  if (format === "mp3") await ensureMp3();
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const audio = await input.getPrimaryAudioTrack();
    if (!audio) throw new Error("This video has no sound to extract.");
    const output = new Output({
      format:
        format === "mp3"
          ? new Mp3OutputFormat()
          : format === "wav"
            ? new WavOutputFormat()
            : new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: format === "mp3" ? { codec: "mp3", bitrate: 192_000 } : format === "m4a" ? { codec: "aac", bitrate: 192_000 } : {},
      showWarnings: false,
    });
    if (!conversion.isValid) throw new Error("This video's sound can't be converted here.");
    conversion.onProgress = (p) => onProgress(p);
    const abort = () => void conversion.cancel();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      await conversion.execute();
    } finally {
      signal?.removeEventListener("abort", abort);
    }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const type = format === "mp3" ? "audio/mpeg" : format === "wav" ? "audio/wav" : "audio/mp4";
    return new Blob([(output.target as BufferTarget).buffer!], { type });
  } finally {
    input.dispose?.();
  }
}

/* ------------------------------------------------------------- merge videos */

export type MergeSize = "first" | "story" | "landscape" | "square";
export type MergeFit = "fit" | "fill";

export const MERGE_SIZES: { id: MergeSize; label: string; detail: string }[] = [
  { id: "first", label: "Like the first clip", detail: "Keeps its size and shape" },
  { id: "story", label: "Reel 9:16", detail: "1080 × 1920" },
  { id: "landscape", label: "Landscape 16:9", detail: "1920 × 1080" },
  { id: "square", label: "Square 1:1", detail: "1080 × 1080" },
];

export type MergeTransition = "cut" | "crossfade" | "black" | "white" | "slide" | "zoom";

export const MERGE_TRANSITIONS: { id: MergeTransition; label: string }[] = [
  { id: "cut", label: "Cut" },
  { id: "crossfade", label: "Crossfade" },
  { id: "black", label: "Fade to black" },
  { id: "white", label: "Fade to white" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
];

export type ClipInfo = { duration: number; width: number; height: number; hasAudio: boolean };

/** Length, size and whether a clip has sound, read without playing it. */
export async function readClip(file: Blob): Promise<ClipInfo> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new Error("This video can't be decoded here. Try an MP4 (H.264) file.");
    const audio = await input.getPrimaryAudioTrack();
    return {
      duration: await input.computeDuration(),
      width: track.displayWidth,
      height: track.displayHeight,
      hasAudio: !!audio && (await audio.canDecode()),
    };
  } finally {
    input.dispose?.();
  }
}

const FPS = 30;
const RATE = 48000;
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Frame layout of a merge: each clip's frames, the frames it shares with the next clip during a
 * transition (at most half of either clip), where each clip starts, and the total.
 */
export function mergePlan(durations: number[], transition: MergeTransition, seconds: number) {
  const frames = durations.map((d) => Math.max(1, Math.round(d * FPS)));
  const overlap = frames
    .slice(0, -1)
    .map((n, i) => (transition === "cut" ? 0 : Math.max(0, Math.min(Math.round(seconds * FPS), Math.floor(n / 2), Math.floor(frames[i + 1] / 2)))));
  const starts: number[] = [];
  let total = 0;
  frames.forEach((n, i) => {
    starts.push(total);
    total += n - (overlap[i] ?? 0);
  });
  return { frames, overlap, starts, total };
}

/** One transition frame: `a` (the clip ending) into `b` (the clip starting), p from 0 to 1. */
function blend(ctx: CanvasRenderingContext2D, a: HTMLCanvasElement, b: HTMLCanvasElement, p: number, t: MergeTransition) {
  const { width: W, height: H } = ctx.canvas;
  const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
  ctx.save();
  if (t === "slide") {
    ctx.drawImage(a, -e * W, 0);
    ctx.drawImage(b, (1 - e) * W, 0);
  } else if (t === "black" || t === "white") {
    ctx.drawImage(p < 0.5 ? a : b, 0, 0);
    ctx.globalAlpha = 1 - Math.abs(p * 2 - 1);
    ctx.fillStyle = t === "black" ? "#000" : "#fff";
    ctx.fillRect(0, 0, W, H);
  } else if (t === "zoom") {
    const s = 1 + 0.25 * e;
    ctx.drawImage(a, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s);
    ctx.globalAlpha = e;
    ctx.drawImage(b, 0, 0);
  } else {
    ctx.drawImage(a, 0, 0);
    ctx.globalAlpha = e;
    ctx.drawImage(b, 0, 0);
  }
  ctx.restore();
}

/* -------------------------------------------------------- photo slideshow */

export type SlideSize = "story" | "feed" | "square" | "landscape";

export const SLIDE_SIZES: { id: SlideSize; label: string; w: number; h: number }[] = [
  { id: "story", label: "Reel 9:16", w: 1080, h: 1920 },
  { id: "feed", label: "Feed 4:5", w: 1080, h: 1350 },
  { id: "square", label: "Square 1:1", w: 1080, h: 1080 },
  { id: "landscape", label: "Landscape 16:9", w: 1920, h: 1080 },
];

/**
 * Photos into a silent MP4: each fills the frame for `seconds`, with a slow zoom and drift
 * (Ken Burns) when `motion` is on, joined with the merge transitions. The editor then opens it
 * as a reel for music, text and captions.
 */
export async function makeSlideshow(opts: {
  images: Blob[];
  size: SlideSize;
  seconds: number;
  transition: MergeTransition;
  transitionSeconds: number;
  motion: boolean;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<Blob> {
  const { images, size, seconds, transition, transitionSeconds, motion, onProgress, signal } = opts;
  if (!images.length) throw new Error("Add some photos first.");
  const { w: W, h: H } = SLIDE_SIZES.find((s) => s.id === size)!;
  const plan = mergePlan(
    images.map(() => seconds),
    transition,
    transitionSeconds,
  );
  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  if (!videoCodec) throw new Error("No MP4 video encoder is available in this browser.");

  const layer = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const canvas = layer();
  const ctx = canvas.getContext("2d")!;
  const a = layer();
  const b = layer();

  // Decode lazily and keep only the photos in use, so long slideshows of phone photos fit in memory.
  const decoded = new Map<number, ImageBitmap>();
  const photo = async (i: number) => {
    let bmp = decoded.get(i);
    if (!bmp) {
      try {
        bmp = await createImageBitmap(images[i]);
      } catch {
        throw new Error(`Photo ${i + 1} couldn't be opened. Use JPG, PNG or WebP.`);
      }
      decoded.set(i, bmp);
    }
    for (const [k, old] of decoded) {
      if (k < i - 1) {
        old.close();
        decoded.delete(k);
      }
    }
    return bmp;
  };
  // Cover the frame; with motion, zoom in 10% and drift, alternating direction per photo.
  const paint = (target: CanvasRenderingContext2D, bmp: ImageBitmap, i: number, p: number) => {
    const zoom = motion ? 1 + 0.1 * p : 1;
    const scale = Math.max(W / bmp.width, H / bmp.height) * zoom;
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    const drift = motion ? (i % 2 ? -1 : 1) * (p - 0.5) : 0;
    target.fillStyle = "#000";
    target.fillRect(0, 0, W, H);
    target.drawImage(bmp, (W - dw) / 2 + drift * (dw - W) * 0.5, (H - dh) / 2 + drift * (dh - H) * 0.3, dw, dh);
  };

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: Math.round(Math.min(16_000_000, Math.max(4_000_000, W * H * FPS * 0.12))),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });
  await output.start();
  try {
    let i = 0;
    for (let F = 0; F < plan.total; F++) {
      if (signal.aborted) throw new DOMException("Slideshow cancelled", "AbortError");
      while (i + 1 < images.length && F >= plan.starts[i + 1] + (plan.overlap[i] ?? 0)) i++;
      const next = i + 1 < images.length && F >= plan.starts[i + 1] ? i + 1 : null;
      const local = F - plan.starts[i];
      const p = local / plan.frames[i];
      if (next === null) {
        paint(ctx, await photo(i), i, p);
      } else {
        // Transition: photo i is ending, photo `next` starting.
        const into = F - plan.starts[next];
        paint(a.getContext("2d")!, await photo(i), i, p);
        paint(b.getContext("2d")!, await photo(next), next, into / plan.frames[next]);
        blend(ctx, a, b, (into + 1) / (plan.overlap[i] + 1), transition);
      }
      await videoSource.add(F / FPS, 1 / FPS);
      onProgress(Math.min(1, (F + 1) / plan.total));
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  } finally {
    decoded.forEach((bmp) => bmp.close());
  }
  return new Blob([(output.target as BufferTarget).buffer!], { type: "video/mp4" });
}

function targetSize(size: MergeSize, first: ClipInfo) {
  if (size === "story") return { w: 1080, h: 1920 };
  if (size === "landscape") return { w: 1920, h: 1080 };
  if (size === "square") return { w: 1080, h: 1080 };
  // The first clip's shape, at most 1920 on the long side.
  const scale = Math.min(1, 1920 / Math.max(first.width, first.height));
  return { w: even(first.width * scale), h: even(first.height * scale) };
}

/**
 * Join clips into one MP4. Each clip is scaled into the output size (letterboxed on black, or
 * cropped to fill), at 30 fps, and their sound is joined in the same order; clips without sound
 * get silence. With a transition, the end of each clip overlaps the start of the next and they
 * blend, picture and sound, over `transitionSeconds`.
 */
export async function mergeVideos(opts: {
  files: Blob[];
  infos: ClipInfo[];
  size: MergeSize;
  fit: MergeFit;
  transition?: MergeTransition;
  transitionSeconds?: number;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<Blob> {
  const { files, infos, size, fit, transition = "cut", transitionSeconds = 0.6, onProgress, signal } = opts;
  if (files.length < 2) throw new Error("Add at least two videos to merge.");
  const { w: W, h: H } = targetSize(size, infos[0]);
  const plan = mergePlan(
    infos.map((c) => c.duration),
    transition,
    transitionSeconds,
  );
  const total = plan.total / FPS;
  const check = () => {
    if (signal.aborted) throw new DOMException("Merge cancelled", "AbortError");
  };

  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  if (!videoCodec) throw new Error("No MP4 video encoder is available in this browser.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // Transitions paint the ending clip into `a` and the starting one into `b`, then blend.
  const layer = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const a = layer();
  const b = layer();
  const paint = (target: CanvasRenderingContext2D, sample: VideoSample) => {
    const sw = sample.displayWidth;
    const sh = sample.displayHeight;
    const scale = fit === "fill" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    target.fillStyle = "#000";
    target.fillRect(0, 0, W, H);
    sample.draw(target, (W - dw) / 2, (H - dh) / 2, dw, dh);
    sample.close();
  };

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: Math.round(Math.min(16_000_000, Math.max(4_000_000, W * H * FPS * 0.12))),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });

  // Sound: lay every clip's audio on one timeline at a common sample rate.
  let audioSource: AudioBufferSource | null = null;
  let mix: AudioBuffer | null = null;
  if (infos.some((c) => c.hasAudio)) {
    const offline = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * RATE)), RATE);
    for (let i = 0; i < files.length; i++) {
      check();
      if (infos[i].hasAudio) {
        const at = plan.starts[i] / FPS;
        const end = at + plan.frames[i] / FPS;
        // The sound crossfades over the same frames as the picture.
        const fadeIn = (plan.overlap[i - 1] ?? 0) / FPS;
        const fadeOut = (plan.overlap[i] ?? 0) / FPS;
        const gain = offline.createGain();
        gain.connect(offline.destination);
        if (fadeIn) {
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(1, at + fadeIn);
        }
        if (fadeOut) {
          gain.gain.setValueAtTime(1, end - fadeOut);
          gain.gain.linearRampToValueAtTime(0, end);
        }
        const input = new Input({ source: new BlobSource(files[i]), formats: ALL_FORMATS });
        try {
          const track = await input.getPrimaryAudioTrack();
          if (track) {
            const first = await track.getFirstTimestamp();
            for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers()) {
              const when = at + timestamp - Math.min(0, first);
              if (when >= end) break;
              const node = offline.createBufferSource();
              node.buffer = buffer;
              node.connect(gain);
              node.start(Math.max(0, when));
            }
          }
        } finally {
          input.dispose?.();
        }
      }
      onProgress(0.08 * ((i + 1) / files.length));
    }
    mix = await offline.startRendering();
    const audioCodec = await getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: 2, sampleRate: RATE });
    if (audioCodec) {
      audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 192_000 });
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();
  try {
    if (audioSource && mix) await audioSource.add(mix);
    onProgress(0.1);

    let frameIndex = 0;
    let drawn = false;
    // The previous clip's last frames, still to be blended into this clip's first ones.
    let tail: { frames: AsyncIterator<VideoSample | null>; input: Input } | null = null;
    const closeTail = async () => {
      await tail?.frames.return?.();
      tail?.input.dispose?.();
      tail = null;
    };
    try {
      for (let i = 0; i < files.length; i++) {
        const input = new Input({ source: new BlobSource(files[i]), formats: ALL_FORMATS });
        let keepOpen = false;
        try {
          const track = await input.getPrimaryVideoTrack();
          if (!track) throw new Error("A clip has no video.");
          const first = await track.getFirstTimestamp();
          const sink = new VideoSampleSink(track);
          const at = (f: number) => Math.max(first, f / FPS);
          const head = plan.overlap[i - 1] ?? 0;
          const out = plan.overlap[i] ?? 0;
          // This clip's own frames; its last `out` frames are drawn during the next transition.
          const own = Array.from({ length: plan.frames[i] - out }, (_, f) => at(f));
          let f = 0;
          for await (const sample of sink.samplesAtTimestamps(own)) {
            check();
            if (f < head && tail) {
              const prev = await tail.frames.next();
              if (!prev.done && prev.value) paint(a.getContext("2d")!, prev.value);
              if (sample) paint(b.getContext("2d")!, sample);
              blend(ctx, a, b, (f + 1) / (head + 1), transition);
              drawn = true;
              if (f === head - 1) await closeTail();
            } else if (sample) {
              paint(ctx, sample);
              drawn = true;
            }
            // A gap in the file repeats the previous frame.
            if (drawn) await videoSource.add(frameIndex / FPS, 1 / FPS);
            frameIndex++;
            f++;
            onProgress(0.1 + 0.88 * Math.min(1, frameIndex / plan.total));
          }
          if (out) {
            const times = Array.from({ length: out }, (_, j) => at(plan.frames[i] - out + j));
            tail = { frames: sink.samplesAtTimestamps(times)[Symbol.asyncIterator](), input };
            keepOpen = true;
          }
        } finally {
          if (!keepOpen) input.dispose?.();
        }
      }
    } finally {
      await closeTail();
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }
  onProgress(1);
  return new Blob([(output.target as BufferTarget).buffer!], { type: "video/mp4" });
}
