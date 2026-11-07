"use client";

import type { InferenceSession } from "onnxruntime-web";

/**
 * On-device background removal with U²-Netp (Apache-2.0) on ONNX Runtime Web (MIT).
 * Nothing leaves the device. The model and runtime are served from the app itself
 * (/models, /ort), so it also works offline in the desktop app.
 * shortcut: U²-Netp is small (4.5 MB) but its edges are soft; swap in IS-Net (Apache-2.0) if quality needs to go up.
 */
const SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let session: Promise<{ ort: typeof import("onnxruntime-web/wasm"); s: InferenceSession }> | null = null;

function load() {
  session ??= (async () => {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = "/ort/";
    // Threads need cross-origin isolation, which the app doesn't use; one thread is plenty here.
    ort.env.wasm.numThreads = 1;
    const s = await ort.InferenceSession.create("/models/u2netp.onnx", { executionProviders: ["wasm"] });
    return { ort, s };
  })().catch((err) => {
    session = null;
    throw err;
  });
  return session;
}

/** The subject cut out of `img`, at the image's own size, with a transparent background. */
export async function removeBackground(img: CanvasImageSource & { width: number; height: number }): Promise<HTMLCanvasElement> {
  const { ort, s } = await load();
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;

  // Model input: 320×320, RGB, ImageNet-normalised, channels first.
  const small = document.createElement("canvas");
  small.width = small.height = SIZE;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, SIZE, SIZE);
  const px = sctx.getImageData(0, 0, SIZE, SIZE).data;
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + i] = (px[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const pred = out[s.outputNames[0]].data as Float32Array;

  // Normalise, then firm up the edges a little so the cut-out isn't hazy.
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of pred) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const mask = sctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = (pred[i] - lo) / (hi - lo || 1);
    const a = Math.min(1, Math.max(0, (v - 0.12) / 0.76));
    mask.data[i * 4 + 3] = Math.round(a * 255);
  }
  sctx.putImageData(mask, 0, 0);

  // Full size: the photo, kept only where the (smoothly upscaled) mask is opaque.
  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  const octx = outCanvas.getContext("2d")!;
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = "destination-in";
  octx.imageSmoothingQuality = "high";
  octx.drawImage(small, 0, 0, w, h);
  return outCanvas;
}
