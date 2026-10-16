import { ensureFonts, postDims, renderPost, type Assets } from "./render";
import type { MusicTrack, Orientation, PostState, VideoClip } from "./types";

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
 * Audio. A media element can feed Web Audio only once, so every element gets
 * one source node for its lifetime, all in one shared context. Each plays to
 * the speakers through a gain we can silence while recording, and into one
 * shared stream the recorder listens to, where the video and music mix.
 */
type Mixer = { ctx: AudioContext; record: MediaStreamAudioDestinationNode };
let mixer: Mixer | null = null;
const speakerGains = new WeakMap<HTMLMediaElement, GainNode>();

function getMixer(): Mixer {
  if (!mixer) {
    const ctx = new AudioContext();
    mixer = { ctx, record: ctx.createMediaStreamDestination() };
  }
  return mixer;
}

/** Route an element through the mixer (once) and return its speaker gain. */
function route(el: HTMLMediaElement): GainNode {
  let speakers = speakerGains.get(el);
  if (!speakers) {
    const { ctx, record } = getMixer();
    const src = ctx.createMediaElementSource(el);
    speakers = ctx.createGain();
    src.connect(speakers).connect(ctx.destination);
    src.connect(record);
    speakerGains.set(el, speakers);
  }
  return speakers;
}

/** Load an audio file or library URL, ready to play. */
export function loadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.onloadedmetadata = () => resolve(audio);
    audio.onerror = () => reject(new Error("This audio couldn't be opened. Try an MP3, M4A or WAV file."));
    audio.src = src;
  });
}

/**
 * Where the music should be when the video is at `videoTime`. The music starts
 * at `offset` when the reel starts and is cut to the reel's length; shorter
 * tracks loop when `loop` is on, otherwise they stop. Null means silence.
 */
export function musicTimeAt(music: MusicTrack, clip: VideoClip, videoTime: number): number | null {
  const elapsed = Math.max(0, videoTime - clip.trimStart);
  const playable = Math.max(0.1, music.duration - music.offset);
  if (elapsed < playable) return music.offset + elapsed;
  return music.loop ? music.offset + (elapsed % playable) : null;
}

/** Volume (0..1) for the music at this point of the reel, including the fade-out. */
export function musicVolumeAt(music: MusicTrack, clip: VideoClip, videoTime: number): number {
  if (!music.on) return 0;
  const base = music.volume / 100;
  if (!music.fade) return base;
  const remaining = clip.trimEnd - videoTime;
  const FADE = 1.5;
  return remaining < FADE ? base * Math.max(0, remaining / FADE) : base;
}

/** Keep a music element in step with the video. Small drift is left alone to avoid audible skips. */
export function syncMusic(audio: HTMLAudioElement, music: MusicTrack, clip: VideoClip, video: HTMLVideoElement) {
  const t = musicTimeAt(music, clip, video.currentTime);
  audio.volume = Math.min(1, musicVolumeAt(music, clip, video.currentTime));
  if (t === null || video.paused) {
    if (!audio.paused) audio.pause();
    if (t !== null && Math.abs(audio.currentTime - t) > 0.05) audio.currentTime = t;
    return;
  }
  if (Math.abs(audio.currentTime - t) > 0.25) audio.currentTime = t;
  if (audio.paused) void audio.play().catch(() => {});
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

const nextSeek = (media: HTMLMediaElement, t: number) =>
  new Promise<void>((resolve) => {
    if (Math.abs(media.currentTime - t) < 0.01) return resolve();
    media.addEventListener("seeked", () => resolve(), { once: true });
    media.currentTime = t;
  });

/**
 * Record the reel in real time: play the trimmed range, composite every frame
 * with the post's look, text and stickers, and capture the canvas plus the
 * mixed sound (original audio and background music at their volumes).
 */
export async function exportReel(opts: {
  video: HTMLVideoElement;
  frame: HTMLCanvasElement;
  orientation: Orientation;
  assets: Assets;
  state: PostState;
  music?: HTMLAudioElement;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<{ blob: Blob; ext: string }> {
  const { video, frame, orientation, assets, state, music, onProgress, signal } = opts;
  const clip = state.video;
  const track = music && state.music?.on ? state.music : null;
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
  const withVideoSound = clip.audio && clip.volume > 0;
  const routed: { el: HTMLMediaElement; speakers: GainNode; muted: boolean; volume: number }[] = [];
  if (withVideoSound || track) {
    const m = getMixer();
    await m.ctx.resume();
    m.record.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    // Elements must be audible for Web Audio to hear them; their speaker branch is silenced instead.
    for (const el of [withVideoSound ? video : null, track ? music! : null]) {
      if (!el) continue;
      const speakers = route(el);
      routed.push({ el, speakers, muted: el.muted, volume: el.volume });
      speakers.gain.value = 0;
      el.muted = false;
    }
  }
  if (!withVideoSound) {
    // Keep the original sound out with volume 0, but unmute the element: the preview copies the
    // video's mute state onto the music, so a muted video would silence the music too.
    routed.push({ el: video, speakers: route(video), muted: video.muted, volume: video.volume });
    video.volume = 0;
    video.muted = false;
  } else {
    video.volume = Math.min(1, clip.volume / 100);
  }

  const wasLoop = video.loop;
  video.pause();
  music?.pause();
  video.loop = false;
  await nextSeek(video, clip.trimStart);
  if (track && music) {
    const t = musicTimeAt(track, clip, clip.trimStart);
    if (t !== null) await nextSeek(music, t);
  }
  draw();

  const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const restore = () => {
    video.pause();
    music?.pause();
    video.loop = wasLoop;
    for (const r of routed) {
      r.el.muted = r.muted;
      r.el.volume = r.volume;
      r.speakers.gain.value = 1;
    }
    stream.getVideoTracks().forEach((t) => t.stop());
  };

  try {
    recorder.start(250);
    draw();
    await video.play();
    if (track && music) syncMusic(music, track, clip, video);
    await new Promise<void>((resolve, reject) => {
      const length = Math.max(0.1, clip.trimEnd - clip.trimStart);
      const step = () => {
        draw();
        if (track && music) syncMusic(music, track, clip, video);
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

/** Apply the clip's original-sound setting to the preview. */
export function applyClipVolume(video: HTMLVideoElement, clip: VideoClip) {
  video.volume = clip.audio ? Math.min(1, clip.volume / 100) : 0;
}

/** The music follows the preview's mute button. */
export function setMediaMuted(el: HTMLMediaElement, muted: boolean) {
  el.muted = muted;
}

export function formatTime(t: number) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}
