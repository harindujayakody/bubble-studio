/**
 * Animated GIF stickers for reels. The browser's ImageDecoder (WebCodecs) unpacks every frame
 * once; drawing then picks the frame for the reel's current time, so the preview, fast export
 * and recording all play the GIF in step. Frames live here, outside the design state.
 */
type Gif = { frames: ImageBitmap[]; times: number[]; total: number; width: number; height: number };

const cache = new Map<string, Gif>();
const MAX_FRAMES = 400;

type Decoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  decode: (o: { frameIndex: number }) => Promise<{ image: VideoFrame }>;
  close: () => void;
};

export function canDecodeGif() {
  return typeof window !== "undefined" && "ImageDecoder" in window;
}

/** Unpack a GIF's frames and keep them under `id`. */
export async function loadGif(id: string, blob: Blob): Promise<Gif> {
  const hit = cache.get(id);
  if (hit) return hit;
  const Ctor = (window as unknown as { ImageDecoder: new (o: object) => Decoder }).ImageDecoder;
  const decoder = new Ctor({ data: await blob.arrayBuffer(), type: "image/gif" });
  try {
    await decoder.tracks.ready;
    const count = Math.min(MAX_FRAMES, decoder.tracks.selectedTrack?.frameCount ?? 1);
    const frames: ImageBitmap[] = [];
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      // GIFs with no delay play at 10 fps in browsers; do the same.
      const d = image.duration ? image.duration / 1e6 : 0.1;
      frames.push(await createImageBitmap(image));
      times.push(t);
      t += Math.max(0.02, d);
      image.close();
    }
    const gif = { frames, times, total: Math.max(0.02, t), width: frames[0]?.width ?? 1, height: frames[0]?.height ?? 1 };
    cache.set(id, gif);
    return gif;
  } finally {
    decoder.close();
  }
}

/** The frame showing at `time` seconds, looping; null until the GIF has been unpacked. */
export function gifFrame(id: string, time: number): ImageBitmap | null {
  const gif = cache.get(id);
  if (!gif || gif.frames.length === 0) return null;
  const t = ((time % gif.total) + gif.total) % gif.total;
  let lo = 0;
  let hi = gif.times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (gif.times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return gif.frames[lo];
}
