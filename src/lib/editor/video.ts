import { ensureFonts, postDims, renderPost, type Assets } from "./render";
import type { Orientation, PostState } from "./types";

/** Load a video file into a detached element ready for drawing. */
export function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true;
    video.muted = true;
    // Chrome only decodes frames (and fires requestVideoFrameCallback) for videos in the document,
    // so keep it attached but invisible.
    video.setAttribute("aria-hidden", "true");
    Object.assign(video.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "2px",
      height: "2px",
      opacity: "0",
      pointerEvents: "none",
    });
    document.body.appendChild(video);
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => {
      if (Number.isFinite(video.duration)) return resolve(video);
      // Some recorded WebM files report an infinite duration until the end has been seen once.
      video.ondurationchange = () => {
        if (!Number.isFinite(video.duration)) return;
        video.ondurationchange = null;
        video.currentTime = 0;
        resolve(video);
      };
      video.currentTime = 1e9;
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error("This video couldn't be opened. Try an MP4 (H.264) or WebM file."));
    };
  });
}

/** A canvas sized to the video after rotation; the rest of the editor treats it like a photo. */
export function createFrameCanvas(video: HTMLVideoElement, o: Orientation) {
  const swap = o.rotation === 90 || o.rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? video.videoHeight : video.videoWidth;
  canvas.height = swap ? video.videoWidth : video.videoHeight;
  paintFrame(canvas, video, o);
  return canvas;
}

/** Copy the current video frame into the frame canvas, applying rotation and flips. */
export function paintFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement, o: Orientation) {
  const ctx = canvas.getContext("2d");
  if (!ctx || video.readyState < 2) return;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
  ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
  ctx.restore();
}

/** Run `cb` for every new video frame (requestVideoFrameCallback where available). Returns a stop function. */
export function onEachFrame(video: HTMLVideoElement, cb: () => void) {
  let stopped = false;
  let handle = 0;
  const rvfc = "requestVideoFrameCallback" in video;
  const loop = () => {
    if (stopped) return;
    cb();
    handle = rvfc ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
  };
  handle = rvfc ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
  return () => {
    stopped = true;
    if (rvfc) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
  };
}

/*
 * Audio. A media element can feed Web Audio only once, so each video gets one
 * graph for its lifetime: the element plays to the speakers through a gain we
 * can silence, and to a stream destination the recorder listens to.
 */
type AudioGraph = { ctx: AudioContext; speakers: GainNode; record: MediaStreamAudioDestinationNode };
const graphs = new WeakMap<HTMLVideoElement, AudioGraph>();

function audioGraph(video: HTMLVideoElement): AudioGraph {
  let g = graphs.get(video);
  if (!g) {
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(video);
    const speakers = ctx.createGain();
    const record = ctx.createMediaStreamDestination();
    src.connect(speakers).connect(ctx.destination);
    src.connect(record);
    g = { ctx, speakers, record };
    graphs.set(video, g);
  }
  return g;
}

/** The best format this browser can record, MP4 first since Facebook and phones prefer it. */
export function reelFormat(): { mime: string; ext: "mp4" | "webm"; label: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = [
    { mime: "video/mp4;codecs=avc1.42E01F,mp4a.40.2", ext: "mp4", label: "MP4" },
    { mime: "video/mp4;codecs=avc1,opus", ext: "mp4", label: "MP4" },
    { mime: "video/mp4", ext: "mp4", label: "MP4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm", label: "WebM" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm", label: "WebM" },
    { mime: "video/webm", ext: "webm", label: "WebM" },
  ] as const;
  return options.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null;
}

const nextSeek = (video: HTMLVideoElement, t: number) =>
  new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - t) < 0.01) return resolve();
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = t;
  });

/**
 * Record the reel in real time: play the trimmed range, composite every frame
 * with the post's look, text and stickers, and capture canvas plus sound.
 */
export async function exportReel(opts: {
  video: HTMLVideoElement;
  frame: HTMLCanvasElement;
  orientation: Orientation;
  assets: Assets;
  state: PostState;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<{ blob: Blob; ext: string }> {
  const { video, frame, orientation, assets, state, onProgress, signal } = opts;
  const clip = state.video;
  const format = reelFormat();
  if (!clip || !format) throw new Error("This browser can't record video. Try the latest Chrome, Edge or Safari.");

  await ensureFonts(state);
  const { w, h } = postDims(state);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const draw = () => {
    paintFrame(frame, video, orientation);
    renderPost(ctx, { source: frame, assets, state, width: w, time: video.currentTime });
  };

  const stream = out.captureStream(30);
  let graph: AudioGraph | null = null;
  if (clip.audio) {
    graph = audioGraph(video);
    await graph.ctx.resume();
    graph.record.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }

  const wasLoop = video.loop;
  const wasMuted = video.muted;
  video.pause();
  video.loop = false;
  // The element must be audible for Web Audio to hear it; the speaker branch is silenced instead.
  if (graph) {
    video.muted = false;
    graph.speakers.gain.value = 0;
  }
  await nextSeek(video, clip.trimStart);
  draw();

  const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const restore = () => {
    video.pause();
    video.loop = wasLoop;
    video.muted = wasMuted;
    if (graph) graph.speakers.gain.value = 1;
    stream.getVideoTracks().forEach((t) => t.stop());
  };

  try {
    recorder.start(250);
    draw();
    await video.play();
    await new Promise<void>((resolve, reject) => {
      const length = Math.max(0.1, clip.trimEnd - clip.trimStart);
      const step = () => {
        draw();
        onProgress(Math.min(1, (video.currentTime - clip.trimStart) / length));
        if (video.currentTime >= clip.trimEnd || video.ended) finish();
      };
      const stopFrames = onEachFrame(video, step);
      // Backup clock: frame callbacks can pause (for example while the window is covered); keep frames flowing.
      const timer = window.setInterval(step, 1000 / 30);
      let done = false;
      const stop = () => {
        stopFrames();
        window.clearInterval(timer);
      };
      const finish = () => {
        if (done) return;
        done = true;
        stop();
        resolve();
      };
      video.addEventListener("ended", finish, { once: true });
      signal.addEventListener("abort", () => {
        stop();
        reject(new DOMException("Export cancelled", "AbortError"));
      });
    });
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    restore();
  }

  onProgress(1);
  return { blob: new Blob(chunks, { type: format.mime.split(";")[0] }), ext: format.ext };
}

/** Small setters so components don't write to the element they were handed. */
export function seekVideo(video: HTMLVideoElement, t: number) {
  video.currentTime = t;
}

export function setVideoMuted(video: HTMLVideoElement, muted: boolean) {
  video.muted = muted;
}

export function formatTime(t: number) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}
