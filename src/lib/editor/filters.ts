import type { Adjustments } from "./types";

type FilterParams = {
  brightness: number; // multiplier, 1 = none
  contrast: number;
  saturate: number;
  sepia: number; // 0..1
  grayscale: number; // 0..1
  hue: number; // degrees
};

type Tint = { color: string; alpha: number; blend: GlobalCompositeOperation };

export type FilterPreset = {
  id: string;
  label: string;
  params: Partial<FilterParams>;
  tint?: Tint;
  fade?: number; // 0..1
  vignette?: number; // 0..1
  /** "famous" looks are modelled on well-known photo-app filters. */
  group?: "classic" | "famous";
};

const IDENTITY: FilterParams = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  sepia: 0,
  grayscale: 0,
  hue: 0,
};

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", label: "Original", params: {} },
  { id: "vivid", label: "Vivid", params: { saturate: 1.4, contrast: 1.08 } },
  {
    id: "golden",
    label: "Golden",
    params: { sepia: 0.18, saturate: 1.2, brightness: 1.04 },
    tint: { color: "#ffb347", alpha: 0.22, blend: "soft-light" },
  },
  {
    id: "coastal",
    label: "Coastal",
    params: { saturate: 1.08, brightness: 1.05, hue: -6 },
    tint: { color: "#3aa7d8", alpha: 0.2, blend: "soft-light" },
  },
  {
    id: "film",
    label: "Film",
    params: { contrast: 1.12, saturate: 0.88, sepia: 0.12 },
    tint: { color: "#2f6f5e", alpha: 0.12, blend: "soft-light" },
    fade: 0.12,
  },
  {
    id: "matte",
    label: "Matte",
    params: { contrast: 0.86, brightness: 1.06, saturate: 0.92 },
    fade: 0.22,
  },
  {
    id: "vintage",
    label: "Vintage",
    params: { sepia: 0.45, contrast: 0.92, brightness: 1.05, saturate: 0.9 },
    tint: { color: "#e8a07a", alpha: 0.18, blend: "soft-light" },
    fade: 0.14,
    vignette: 0.3,
  },
  {
    id: "rosy",
    label: "Rosy",
    params: { saturate: 1.12, brightness: 1.05 },
    tint: { color: "#ff6f91", alpha: 0.2, blend: "soft-light" },
  },
  {
    id: "drama",
    label: "Drama",
    params: { contrast: 1.35, saturate: 1.12, brightness: 0.94 },
    vignette: 0.45,
  },
  { id: "mono", label: "Mono", params: { grayscale: 1, contrast: 1.1 } },
  {
    id: "noir",
    label: "Noir",
    params: { grayscale: 1, contrast: 1.5, brightness: 0.9 },
    vignette: 0.4,
  },
  {
    id: "sepia",
    label: "Sepia",
    params: { sepia: 0.85, contrast: 1.05, brightness: 1.02 },
  },

  // Famous looks, approximated from the well-known photo-app filters.
  {
    id: "clarendon",
    label: "Clarendon",
    group: "famous",
    params: { contrast: 1.2, saturate: 1.35 },
    tint: { color: "#7fbbe3", alpha: 0.2, blend: "overlay" },
  },
  {
    id: "gingham",
    label: "Gingham",
    group: "famous",
    params: { brightness: 1.05, hue: -10, contrast: 0.92 },
    tint: { color: "#e6e6fa", alpha: 0.5, blend: "soft-light" },
    fade: 0.1,
  },
  {
    id: "juno",
    label: "Juno",
    group: "famous",
    params: { sepia: 0.25, contrast: 1.15, brightness: 1.1, saturate: 1.6 },
    tint: { color: "#7fbbe3", alpha: 0.15, blend: "overlay" },
  },
  {
    id: "lark",
    label: "Lark",
    group: "famous",
    params: { contrast: 0.9, brightness: 1.1, saturate: 0.95 },
    tint: { color: "#f2f2f2", alpha: 0.35, blend: "soft-light" },
  },
  {
    id: "ludwig",
    label: "Ludwig",
    group: "famous",
    params: { contrast: 1.05, saturate: 1.1, brightness: 1.05, sepia: 0.25 },
    vignette: 0.25,
  },
  {
    id: "valencia",
    label: "Valencia",
    group: "famous",
    params: { contrast: 1.08, brightness: 1.08, sepia: 0.12 },
    tint: { color: "#e8a87c", alpha: 0.3, blend: "soft-light" },
  },
  {
    id: "nashville",
    label: "Nashville",
    group: "famous",
    params: { sepia: 0.2, contrast: 1.2, brightness: 1.05, saturate: 1.2 },
    tint: { color: "#f7b07d", alpha: 0.35, blend: "soft-light" },
    fade: 0.08,
  },
  {
    id: "toaster",
    label: "Toaster",
    group: "famous",
    params: { contrast: 1.4, brightness: 0.92, sepia: 0.15 },
    tint: { color: "#ff7a30", alpha: 0.28, blend: "soft-light" },
    vignette: 0.45,
  },
  {
    id: "walden",
    label: "Walden",
    group: "famous",
    params: { brightness: 1.1, hue: -10, sepia: 0.3, saturate: 1.5 },
    tint: { color: "#4a7dff", alpha: 0.18, blend: "screen" },
  },
  {
    id: "xpro2",
    label: "X-Pro II",
    group: "famous",
    params: { sepia: 0.3, contrast: 1.3, saturate: 1.3 },
    tint: { color: "#e6e6b4", alpha: 0.25, blend: "soft-light" },
    vignette: 0.55,
  },
];

export function getPreset(id: string): FilterPreset {
  return FILTER_PRESETS.find((p) => p.id === id) ?? FILTER_PRESETS[0];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type ResolvedLook = {
  css: string;
  tints: Tint[];
  fade: number;
  vignette: number;
  blurPx: number;
};

/**
 * Combine a preset (scaled by strength) with manual adjustments into one
 * canvas filter string plus the overlay passes the canvas filter can't express.
 * `scale` converts blur from 1080px space to the target canvas size.
 */
export function resolveLook(
  presetId: string,
  strength: number,
  adjust: Adjustments,
  scale = 1,
): ResolvedLook {
  const preset = getPreset(presetId);
  const t = strength / 100;
  const p = { ...IDENTITY, ...preset.params };
  const mix = (k: keyof FilterParams) => lerp(IDENTITY[k], p[k], t);

  const brightness = mix("brightness") * (1 + adjust.brightness / 250);
  const contrast = mix("contrast") * (1 + adjust.contrast / 200);
  const saturate = mix("saturate") * (1 + adjust.saturation / 100);
  const blurPx = (adjust.blur / 100) * 12 * scale;

  const css = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${Math.max(0, saturate).toFixed(3)})`,
    `sepia(${mix("sepia").toFixed(3)})`,
    `grayscale(${mix("grayscale").toFixed(3)})`,
    `hue-rotate(${mix("hue").toFixed(1)}deg)`,
    blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tints: Tint[] = [];
  if (preset.tint) tints.push({ ...preset.tint, alpha: preset.tint.alpha * t });
  if (adjust.warmth !== 0) {
    tints.push({
      color: adjust.warmth > 0 ? "#ff9a3c" : "#3c8dff",
      alpha: (Math.abs(adjust.warmth) / 100) * 0.38,
      blend: "soft-light",
    });
  }

  return {
    css,
    tints,
    fade: Math.min(1, (preset.fade ?? 0) * t + (adjust.fade / 100) * 0.35),
    vignette: Math.min(1, (preset.vignette ?? 0) * t + (adjust.vignette / 100) * 0.8),
    blurPx,
  };
}
