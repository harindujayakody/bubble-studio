import {
  ALL_FORMATS,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  VideoSampleSink,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import { ensureFonts, exportDims, fitExport, renderPost, type Assets } from "./render";
import type { Orientation, PostState } from "./types";

const FPS = 30;
const SAMPLE_RATE = 48000;
const FADE = 1.5;

/** Frame-by-frame export needs WebCodecs (Chrome, Edge, the desktop app, recent Safari). */
export function canFastExport() {
  return typeof window !== "undefined" && "VideoEncoder" in window && "AudioEncoder" in window;
}

/**
 * Mix the reel's sound offline: the clip's own audio and the background music at
 * their volumes, the music starting at its offset, looping if short and fading out.
 * Returns null when the reel is silent.
 */
async function mixAudio(file: Blob, state: PostState, length: number): Promise<AudioBuffer | null> {
  const clip = state.video!;
  const music = state.music?.on && state.music.volume > 0 ? state.music : null;
  const wantOriginal = clip.audio && clip.volume > 0;
  if (!wantOriginal && !music) return null;

  const ctx = new OfflineAudioContext(2, Math.ceil(length * SAMPLE_RATE), SAMPLE_RATE);
  const decode = async (data: ArrayBuffer) => {
    try {
      return await ctx.decodeAudioData(data);
    } catch {
      return null; // e.g. a clip without an audio track
    }
  };
  let any = false;

  if (wantOriginal) {
    const buffer = await decode(await file.arrayBuffer());
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = clip.volume / 100;
      src.connect(gain).connect(ctx.destination);
      src.start(0, clip.trimStart, length);
      any = true;
    }
  }

  if (music) {
    const buffer = await decode(await (await fetch(music.src)).arrayBuffer());
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (music.loop && buffer.duration - music.offset < length) {
        src.loop = true;
        src.loopStart = music.offset;
        src.loopEnd = buffer.duration;
      }
      const gain = ctx.createGain();
      const level = music.volume / 100;
      gain.gain.setValueAtTime(level, 0);
      if (music.fade && length > FADE) {
        gain.gain.setValueAtTime(level, length - FADE);
        gain.gain.linearRampToValueAtTime(0, length);
      }
      src.connect(gain).connect(ctx.destination);
      src.start(0, music.offset);
      src.stop(length);
      any = true;
    }
  }

  return any ? ctx.startRendering() : null;
}

/**
 * Export the reel without playing it: decode each frame straight from the file,
 * composite it with the post's look, text and stickers, and encode to MP4 with
 * WebCodecs. Much faster than real time, and every frame lands exactly.
 */
export async function fastExportReel(opts: {
  file: Blob;
  orientation: Orientation;
  assets: Assets;
  state: PostState;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<{ blob: Blob; ext: "mp4" }> {
  const { file, orientation, assets, state, onProgress, signal } = opts;
  const clip = state.video;
  if (!clip) throw new Error("Add a video first.");
  const length = Math.max(0.1, clip.trimEnd - clip.trimStart);

  await ensureFonts(state);
  const { w, h } = exportDims(state);
  // Encoders want even dimensions.
  const W = w - (w % 2);
  const H = h - (h % 2);

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track || !(await track.canDecode())) throw new Error("This video can't be decoded here. Try an MP4 (H.264) file.");

  const videoCodec = await getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: W, height: H });
  if (!videoCodec) throw new Error("No MP4 video encoder is available in this browser.");

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d")!;
  const frame = document.createElement("canvas");
  const frameCtx = frame.getContext("2d")!;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const videoSource = new CanvasSource(out, {
    codec: videoCodec,
    bitrate: Math.round(Math.min(16_000_000, Math.max(4_000_000, W * H * FPS * 0.12))),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });

  onProgress(0.02);
  const mix = await mixAudio(file, state, length);
  let audioSource: AudioBufferSource | null = null;
  if (mix) {
    const audioCodec = await getFirstEncodableAudioCodec(["aac", "opus"], {
      numberOfChannels: 2,
      sampleRate: SAMPLE_RATE,
    });
    if (audioCodec) {
      audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 192_000 });
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();
  if (audioSource && mix) await audioSource.add(mix);
  onProgress(0.08);

  const total = Math.max(1, Math.round(length * FPS));
  const times = Array.from({ length: total }, (_, i) => clip.trimStart + i / FPS);
  // Files often start their first frame a little after 0 s; earlier lookups would return nothing and
  // leave the reel's opening black, so clamp them to the first frame.
  const firstFrame = await track.getFirstTimestamp();
  const lookups = times.map((t) => Math.max(t, firstFrame));
  const sink = new VideoSampleSink(track);
  const swap = orientation.rotation === 90 || orientation.rotation === 270;

  try {
    let i = 0;
    let last: { w: number; h: number } | null = null;
    for await (const sample of sink.samplesAtTimestamps(lookups)) {
      if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");
      if (sample) {
        // The editor's own rotation and flips go on top of the file's rotation metadata (which draw() applies).
        const sw = sample.displayWidth;
        const sh = sample.displayHeight;
        const fw = swap ? sh : sw;
        const fh = swap ? sw : sh;
        if (frame.width !== fw || frame.height !== fh) {
          frame.width = fw;
          frame.height = fh;
        }
        frameCtx.save();
        frameCtx.translate(fw / 2, fh / 2);
        frameCtx.rotate((orientation.rotation * Math.PI) / 180);
        frameCtx.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
        sample.draw(frameCtx, -sw / 2, -sh / 2, sw, sh);
        frameCtx.restore();
        sample.close();
        last = { w: fw, h: fh };
      }
      // A missing frame (gap in the file) repeats the previous one.
      if (last) {
        renderPost(outCtx, { source: frame, assets, state, width: W, time: times[i] });
        await videoSource.add(i / FPS, 1 / FPS);
      }
      i++;
      onProgress(0.08 + 0.9 * (i / total));
    }
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  } finally {
    input.dispose?.();
  }

  onProgress(1);
  const buffer = (output.target as BufferTarget).buffer!;
  return { blob: new Blob([buffer], { type: "video/mp4" }), ext: "mp4" };
}

/** Length, size and a poster frame of a video file, read without playing it. */
export async function probeVideo(file: Blob): Promise<{ duration: number; width: number; height: number; poster: HTMLCanvasElement }> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new Error("This video can't be decoded here. Try an MP4 (H.264) file.");
    const duration = await input.computeDuration();
    const first = await track.getFirstTimestamp();
    const sample = await new VideoSampleSink(track).getSample(Math.max(first, Math.min(1, duration / 2)));
    const poster = document.createElement("canvas");
    if (sample) {
      poster.width = sample.displayWidth;
      poster.height = sample.displayHeight;
      sample.draw(poster.getContext("2d")!, 0, 0, poster.width, poster.height);
      sample.close();
    }
    return { duration, width: poster.width, height: poster.height, poster };
  } finally {
    input.dispose?.();
  }
}

/** The reel's design applied to another clip: same look, text, stickers, music and sound settings. */
export function reelDesignFor(
  state: PostState,
  clip: { id: string; name: string; duration: number; width: number; height: number },
): PostState {
  return {
    ...state,
    video: {
      id: clip.id,
      name: clip.name,
      duration: clip.duration,
      trimStart: 0,
      trimEnd: Math.min(clip.duration, 90),
      audio: state.video?.audio ?? true,
      volume: state.video?.volume ?? 100,
    },
    crop: null,
    orientation: { rotation: 0, flipX: false, flipY: false },
    custom: fitExport(clip.width, clip.height),
  };
}
