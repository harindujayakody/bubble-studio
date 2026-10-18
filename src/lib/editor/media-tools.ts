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

function targetSize(size: MergeSize, first: ClipInfo) {
  if (size === "story") return { w: 1080, h: 1920 };
  if (size === "landscape") return { w: 1920, h: 1080 };
  if (size === "square") return { w: 1080, h: 1080 };
  // The first clip's shape, at most 1920 on the long side.
  const scale = Math.min(1, 1920 / Math.max(first.width, first.height));
  return { w: even(first.width * scale), h: even(first.height * scale) };
}

/**
 * Join clips end to end into one MP4. Each clip is scaled into the output size (letterboxed on
 * black, or cropped to fill), at 30 fps, and their sound is joined in the same order; clips
 * without sound get silence.
 */
export async function mergeVideos(opts: {
  files: Blob[];
  infos: ClipInfo[];
  size: MergeSize;
  fit: MergeFit;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<Blob> {
  const { files, infos, size, fit, onProgress, signal } = opts;
  if (files.length < 2) throw new Error("Add at least two videos to merge.");
  const { w: W, h: H } = targetSize(size, infos[0]);
  const total = infos.reduce((s, c) => s + c.duration, 0);
  const check = () => {
    if (signal.aborted) throw new DOMException("Merge cancelled", "AbortError");
  };

  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  if (!videoCodec) throw new Error("No MP4 video encoder is available in this browser.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

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
    let at = 0;
    for (let i = 0; i < files.length; i++) {
      check();
      if (infos[i].hasAudio) {
        const input = new Input({ source: new BlobSource(files[i]), formats: ALL_FORMATS });
        try {
          const track = await input.getPrimaryAudioTrack();
          if (track) {
            const first = await track.getFirstTimestamp();
            for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers()) {
              const when = at + timestamp - Math.min(0, first);
              if (when >= at + infos[i].duration) break;
              const node = offline.createBufferSource();
              node.buffer = buffer;
              node.connect(offline.destination);
              node.start(Math.max(0, when));
            }
          }
        } finally {
          input.dispose?.();
        }
      }
      at += infos[i].duration;
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
    let done = 0;
    for (let i = 0; i < files.length; i++) {
      const input = new Input({ source: new BlobSource(files[i]), formats: ALL_FORMATS });
      try {
        const track = await input.getPrimaryVideoTrack();
        if (!track) throw new Error("A clip has no video.");
        const first = await track.getFirstTimestamp();
        const frames = Math.max(1, Math.round(infos[i].duration * FPS));
        const times = Array.from({ length: frames }, (_, f) => Math.max(first, f / FPS));
        let drawn = false;
        for await (const sample of new VideoSampleSink(track).samplesAtTimestamps(times)) {
          check();
          if (sample) {
            const sw = sample.displayWidth;
            const sh = sample.displayHeight;
            const scale = fit === "fill" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
            const dw = sw * scale;
            const dh = sh * scale;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, W, H);
            sample.draw(ctx, (W - dw) / 2, (H - dh) / 2, dw, dh);
            sample.close();
            drawn = true;
          }
          // A gap in the file repeats the previous frame.
          if (drawn) await videoSource.add(frameIndex / FPS, 1 / FPS);
          frameIndex++;
          done += 1 / FPS;
          onProgress(0.1 + 0.88 * Math.min(1, done / total));
        }
      } finally {
        input.dispose?.();
      }
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }
  onProgress(1);
  return new Blob([(output.target as BufferTarget).buffer!], { type: "video/mp4" });
}
