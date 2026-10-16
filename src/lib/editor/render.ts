import { fontString } from "./fonts";
import { resolveLook } from "./filters";
import { autoOutline } from "./color";
import { stackOrder, visibleAt } from "./layers";
import { drawSticker, stickerSize } from "./stickers";
import {
  POST_SIZES,
  type Region,
  type Crop,
  type Orientation,
  type PostState,
  type TextLayer,
} from "./types";

export type Source = HTMLCanvasElement;

/** Bake rotation and flips into a canvas so every later step works in one space. */
export function orientImage(
  img: HTMLImageElement,
  o: Orientation,
  maxSide = 4096,
): Source {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const swap = o.rotation === 90 || o.rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas;
}

/** Post dimensions in output pixels. */
export function postDims(state: Pick<PostState, "size">) {
  const { w, h } = POST_SIZES[state.size];
  return { w, h, aspect: w / h };
}

/** Largest centred crop of the given aspect (width / height) that fits the photo. */
export function defaultCrop(w: number, h: number, aspect: number): Crop {
  const size = Math.min(w, h * aspect);
  return { x: (w - size) / 2, y: (h - size / aspect) / 2, size };
}

export function clampCrop(c: Crop, w: number, h: number, aspect: number): Crop {
  const max = Math.min(w, h * aspect);
  const size = Math.max(max * 0.1, Math.min(c.size, max));
  return {
    size,
    x: Math.min(Math.max(0, c.x), w - size),
    y: Math.min(Math.max(0, c.y), h - size / aspect),
  };
}

export type Assets = Record<string, HTMLImageElement>;

export type TextBox = {
  id: string;
  kind: "text" | "sticker";
  /** Center and size as fractions of the post. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
};

type LaidOutText = {
  lines: { text: string; width: number }[];
  lineHeight: number;
  boxW: number;
  boxH: number;
};

function layoutText(ctx: CanvasRenderingContext2D, layer: TextLayer, scale: number, postW: number): LaidOutText {
  const fontSize = layer.fontSize * scale;
  ctx.font = fontString(layer.fontFamily, layer.fontWeight, fontSize);
  ctx.letterSpacing = `${(layer.letterSpacing / 100) * fontSize}px`;
  const maxWidth = layer.width * postW * scale;
  const source = layer.uppercase ? layer.text.toUpperCase() : layer.text;

  const lines: { text: string; width: number }[] = [];
  for (const paragraph of source.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: "", width: 0 });
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width > maxWidth) {
        lines.push({ text: line, width: ctx.measureText(line).width });
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push({ text: line, width: ctx.measureText(line).width });
  }

  const lineHeight = fontSize * layer.lineHeight;
  const boxW = Math.max(fontSize * 0.5, ...lines.map((l) => l.width));
  return { lines, lineHeight, boxW, boxH: lineHeight * lines.length };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  scale: number,
  width: number,
  height: number,
  paint = true,
): TextBox {
  const { lines, lineHeight, boxW, boxH } = layoutText(ctx, layer, scale, width / scale);
  const fontSize = layer.fontSize * scale;
  const cx = layer.x * width;
  const cy = layer.y * height;
  const fill = layer.fill;
  const pad = fill.mode === "none" ? 0 : (fill.padding / 100) * fontSize * 0.6;
  const padX = pad * (fill.mode === "lines" ? 0.8 : 1);
  const padY = pad * (fill.mode === "lines" ? 0.25 : 0.7);

  const box: TextBox = {
    id: layer.id,
    kind: "text",
    cx: layer.x,
    cy: layer.y,
    w: (boxW + padX * 2) / width,
    h: (boxH + padY * 2) / height,
    rotation: layer.rotation,
  };
  if (!paint) return box;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const left = -boxW / 2;
  const top = -boxH / 2;
  const lineX = (w: number) =>
    layer.align === "left" ? left : layer.align === "right" ? left + boxW - w : -w / 2;

  if (fill.mode !== "none") {
    ctx.fillStyle = fill.color;
    ctx.globalAlpha = fill.opacity / 100;
    if (fill.mode === "box") {
      const w = boxW + padX * 2;
      const h = boxH + padY * 2;
      roundRect(ctx, -w / 2, -h / 2, w, h, (fill.radius / 100) * Math.min(w, h) * 0.5);
    } else {
      const h = lineHeight + padY * 2;
      lines.forEach((line, i) => {
        if (!line.text) return;
        roundRect(
          ctx,
          lineX(line.width) - padX,
          top + i * lineHeight - padY,
          line.width + padX * 2,
          h,
          (fill.radius / 100) * h * 0.5,
        );
      });
    }
    ctx.globalAlpha = 1;
  }

  if (layer.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = fontSize * 0.18;
    ctx.shadowOffsetY = fontSize * 0.05;
  }
  const outline = layer.outline;
  if (outline?.on && outline.width > 0) {
    // Stroke first (it carries the shadow), then fill on top so the outline sits outside the letters.
    ctx.strokeStyle = outline.color === "auto" ? autoOutline(layer.color) : outline.color;
    ctx.lineWidth = (outline.width / 100) * fontSize * 0.32;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    lines.forEach((line, i) => {
      ctx.strokeText(line.text, lineX(line.width), top + (i + 0.5) * lineHeight);
    });
    ctx.shadowColor = "transparent";
  }
  ctx.fillStyle = layer.color;
  lines.forEach((line, i) => {
    ctx.fillText(line.text, lineX(line.width), top + (i + 0.5) * lineHeight);
  });
  ctx.restore();
  return box;
}

type RenderOptions = {
  source: Source | null;
  /** Output width in px; the height follows the post's ratio. */
  width: number;
  /** Uploaded images used by image stickers. */
  assets?: Assets;
  state: PostState;
  /** Skip text and stickers, e.g. for filter thumbnails. */
  withText?: boolean;
  /** Lay out but don't paint this layer, e.g. while it is edited in place. */
  hideTextId?: string | null;
  /** Playback time in a reel; layers outside their timing are skipped. */
  time?: number;
  /** Override the look, e.g. to preview a preset in a thumbnail. */
  lookOverride?: { filter: string; strength: number; neutralAdjust?: boolean };
};

export function drawPhotoLook(
  ctx: CanvasRenderingContext2D,
  source: Source,
  state: PostState,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  lookOverride?: RenderOptions["lookOverride"],
) {
  const scale = dw / POST_SIZES[state.size].w;
  const look = resolveLook(
    lookOverride?.filter ?? state.filter,
    lookOverride?.strength ?? state.filterStrength,
    lookOverride?.neutralAdjust
      ? { brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, vignette: 0, blur: 0 }
      : state.adjust,
    scale,
  );

  ctx.save();
  ctx.filter = look.css;
  // Blur pulls transparent pixels in from the edge; overdraw so the frame stays solid.
  const bleed = look.blurPx * 2;
  ctx.drawImage(source, sx, sy, sw, sh, -bleed, -bleed, dw + bleed * 2, dh + bleed * 2);
  ctx.filter = "none";

  for (const tint of look.tints) {
    ctx.globalCompositeOperation = tint.blend;
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, dw, dh);
  }
  ctx.globalAlpha = 1;

  if (look.fade > 0) {
    const v = Math.round(look.fade * 110);
    ctx.globalCompositeOperation = "lighten";
    ctx.fillStyle = `rgb(${v + 6},${v + 4},${v})`;
    ctx.fillRect(0, 0, dw, dh);
  }

  ctx.globalCompositeOperation = "source-over";
  if (look.vignette > 0) {
    const r = Math.hypot(dw, dh) / 2;
    const g = ctx.createRadialGradient(dw / 2, dh / 2, r * 0.35, dw / 2, dh / 2, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${(look.vignette * 0.8).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, dw, dh);
  }
  ctx.restore();
}

/** Blur or pixelate areas of what has been drawn so far (photo and background). */
function applyRegions(
  ctx: CanvasRenderingContext2D,
  regions: Region[],
  width: number,
  height: number,
  scale: number,
) {
  for (const r of regions) {
    const x = r.x * width;
    const y = r.y * height;
    const w = r.w * width;
    const h = r.h * height;
    if (w < 1 || h < 1) continue;
    const radius = (4 + (r.strength / 100) * 36) * scale;
    // Copy just the area, plus the margin a blur pulls pixels from, instead of the whole post on every frame.
    const m = r.kind === "blur" ? radius * 3 : 0;
    const sx = Math.max(0, Math.floor(x - m));
    const sy = Math.max(0, Math.floor(y - m));
    const sw = Math.min(width, Math.ceil(x + w + m)) - sx;
    const sh = Math.min(height, Math.ceil(y + h + m)) - sy;
    const copy = document.createElement("canvas");
    copy.width = sw;
    copy.height = sh;
    copy.getContext("2d")!.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    ctx.save();
    ctx.beginPath();
    if (r.shape === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(x, y, w, h);
    ctx.clip();

    if (r.kind === "blur") {
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(copy, sx, sy);
      ctx.filter = "none";
    } else {
      // Pixel blocks are sized in post px, so the effect looks the same at every zoom.
      const block = Math.max(2, (6 + (r.strength / 100) * 54) * scale);
      const cols = Math.max(1, Math.round(w / block));
      const rows = Math.max(1, Math.round(h / block));
      const small = document.createElement("canvas");
      small.width = cols;
      small.height = rows;
      small.getContext("2d")!.drawImage(copy, x - sx, y - sy, w, h, 0, 0, cols, rows);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, cols, rows, x, y, w, h);
    }
    ctx.restore();
  }
}

/** Draw the finished post. Used for the live canvas, thumbnails and export alike. */
export function renderPost(ctx: CanvasRenderingContext2D, opts: RenderOptions): TextBox[] {
  const { source, assets = {}, state, width, withText = true, hideTextId, lookOverride, time } = opts;
  const post = postDims(state);
  const scale = width / post.w;
  const height = Math.round(width / post.aspect);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  const bg = state.background;
  if (bg.kind === "gradient") {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg.from;
  }
  ctx.fillRect(0, 0, width, height);

  if (source) {
    const crop = state.crop ?? defaultCrop(source.width, source.height, post.aspect);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawPhotoLook(ctx, source, state, crop.x, crop.y, crop.size, crop.size / post.aspect, width, height, lookOverride);
    ctx.restore();
  }

  applyRegions(ctx, state.regions, width, height, scale);

  const boxes: TextBox[] = [];
  if (withText) {
    for (const item of stackOrder(state)) {
      if (time !== undefined && !visibleAt(item.layer, time)) continue;
      if (item.kind === "sticker") {
        const s = item.layer;
        if (s.kind === "image" && !assets[s.value]) continue;
        const { w, h } = stickerSize(s, assets);
        ctx.save();
        ctx.translate(s.x * width, s.y * height);
        ctx.rotate((s.rotation * Math.PI) / 180);
        drawSticker(ctx, s, scale, assets);
        ctx.restore();
        boxes.push({ id: s.id, kind: "sticker", cx: s.x, cy: s.y, w: w / post.w, h: h / post.h, rotation: s.rotation });
      } else {
        const layer = item.layer;
        const hidden = layer.id === hideTextId;
        if (!layer.text.trim() && !hidden) continue;
        boxes.push(drawText(ctx, layer, scale, width, height, !hidden));
      }
    }
  }
  ctx.restore();
  return boxes;
}

export async function ensureFonts(state: PostState) {
  if (typeof document === "undefined" || !document.fonts) return;
  const loads = state.texts.map((t) =>
    document.fonts.load(fontString(t.fontFamily, t.fontWeight, 48), t.text || "A").catch(() => []),
  );
  await Promise.all(loads);
}

export async function exportPost(
  source: Source | null,
  assets: Assets,
  state: PostState,
  format: "png" | "jpeg",
  quality: number,
  time?: number,
): Promise<Blob> {
  await ensureFonts(state);
  const canvas = document.createElement("canvas");
  const { w, h } = postDims(state);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  renderPost(ctx, { source, assets, state, width: w, time });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The browser could not encode the image."))),
      `image/${format}`,
      format === "jpeg" ? quality / 100 : undefined,
    ),
  );
}
