"use client";

import type { InferenceSession } from "onnxruntime-web";

/**
 * On-device background removal on ONNX Runtime Web (MIT). Nothing leaves the device.
 * - "quick": U²-Netp (Apache-2.0), 4.5 MB, shipped with the desktop app (/models).
 * - "best": IS-Net general use (Apache-2.0), cleaner hair and edges; the desktop app downloads it
 *   once on request and serves it from the user data folder (/user-models).
 * Runs on the GPU with WebGPU when the computer has one, otherwise on the CPU (WASM).
 */
export type BgModel = "quick" | "best";

const MODELS: Record<BgModel, { url: string; size: number; mean: number[]; std: number[] }> = {
  quick: { url: "/models/u2netp.onnx", size: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] },
  best: { url: "/user-models/isnet-general-use.onnx", size: 1024, mean: [0.5, 0.5, 0.5], std: [1, 1, 1] },
};

type Ort = typeof import("onnxruntime-web/webgpu");
let runtime: Promise<{ ort: Ort; gpu: boolean }> | null = null;
const sessions: Partial<Record<BgModel, Promise<InferenceSession>>> = {};

/** The WebGPU build of ONNX Runtime, which also runs on the CPU. */
function getRuntime() {
  runtime ??= (async () => {
    const ort = await import("onnxruntime-web/webgpu");
    ort.env.wasm.wasmPaths = "/ort/";
    // Threads need cross-origin isolation, which the app doesn't use; one thread is plenty here.
    ort.env.wasm.numThreads = 1;
    const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
    const gpu = !!(await nav.gpu?.requestAdapter().catch(() => null));
    return { ort, gpu };
  })().catch((err) => {
    runtime = null;
    throw err;
  });
  return runtime;
}

function load(model: BgModel) {
  sessions[model] ??= (async () => {
    const { ort, gpu } = await getRuntime();
    if (gpu) {
      try {
        return await ort.InferenceSession.create(MODELS[model].url, { executionProviders: ["webgpu"] });
      } catch {
        // Some GPUs or drivers can't run it; the CPU always can.
      }
    }
    return ort.InferenceSession.create(MODELS[model].url, { executionProviders: ["wasm"] });
  })().catch((err) => {
    delete sessions[model];
    throw err;
  });
  return sessions[model];
}

/** The subject cut out of `img`, at the image's own size, with a transparent background. */
export async function removeBackground(img: CanvasImageSource & { width: number; height: number }, model: BgModel = "quick"): Promise<HTMLCanvasElement> {
  const [{ ort }, s] = await Promise.all([getRuntime(), load(model)]);
  const { size: SIZE, mean: MEAN, std: STD } = MODELS[model];
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;

  // Model input: SIZE×SIZE, RGB, normalised for the model, channels first.
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
  const pred = (await out[s.outputNames[0]].getData()) as Float32Array;

  // Normalise, then firm up the edges a little so the cut-out isn't hazy.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < SIZE * SIZE; i++) {
    lo = Math.min(lo, pred[i]);
    hi = Math.max(hi, pred[i]);
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
