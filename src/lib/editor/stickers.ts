import {
  Cake,
  Calendar,
  Camera,
  Clock,
  Coffee,
  Flower2,
  Gift,
  Heart,
  MapPin,
  Megaphone,
  MessageCircle,
  Music,
  Phone,
  Pizza,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Tag,
  ThumbsUp,
  Truck,
  UtensilsCrossed,
  Wifi,
  Zap,
  type IconNode,
} from "lucide";
import type { Sticker } from "./types";

export const STICKER_ICONS: Record<string, IconNode> = {
  ShoppingBag,
  ShoppingCart,
  Tag,
  Gift,
  Truck,
  Megaphone,
  Star,
  Heart,
  ThumbsUp,
  Sparkles,
  Zap,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Calendar,
  Wifi,
  Coffee,
  UtensilsCrossed,
  Pizza,
  Cake,
  Scissors,
  Shirt,
  Camera,
  Music,
  Flower2,
  Sun,
};

export const STICKER_EMOJI = [
  "🎉", "🎊", "🔥", "⭐", "✨", "💯", "❤️", "😍",
  "😋", "👍", "👉", "📣", "🎁", "🛍️", "🛒", "💸",
  "🏷️", "☕", "🍰", "🎂", "🍕", "🍔", "🥗", "🍹",
  "🌸", "🌹", "🌿", "☀️", "⚡", "✅", "📞", "📍",
  "⏰", "🚚", "💄", "👗", "👟", "📸", "🎵", "🪔",
];

/** Illustrated stickers shipped in /public/custom_icons (transparent PNGs). */
export const CUSTOM_STICKERS = [
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
  ...Array.from({ length: 10 }, (_, i) => `${String(i + 1).padStart(2, "0")}b`),
].map((name) => ({ id: `custom:${name}`, src: `/custom_icons/${name}.png` }));

export const EMOJI_FONT = `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

/** Width and height in post px of a sticker at its current size. */
export function stickerSize(s: Sticker, assets: Record<string, CanvasImageSource & { width: number; height: number }>) {
  if (s.kind === "image") {
    const img = assets[s.value];
    const ratio = img ? img.height / img.width : 1;
    return { w: s.size, h: s.size * ratio };
  }
  return { w: s.size, h: s.size };
}

function traceIcon(ctx: CanvasRenderingContext2D, node: IconNode) {
  for (const [tag, a] of node) {
    const n = (k: string) => Number(a[k] ?? 0);
    if (tag === "path") {
      ctx.stroke(new Path2D(String(a.d)));
      continue;
    }
    ctx.beginPath();
    if (tag === "circle") ctx.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2);
    else if (tag === "ellipse") ctx.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
    else if (tag === "rect") ctx.roundRect(n("x"), n("y"), n("width"), n("height"), n("rx"));
    else if (tag === "line") {
      ctx.moveTo(n("x1"), n("y1"));
      ctx.lineTo(n("x2"), n("y2"));
    } else if (tag === "polyline" || tag === "polygon") {
      const pts = String(a.points).trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i < pts.length; i += 2) ctx[i ? "lineTo" : "moveTo"](pts[i], pts[i + 1]);
      if (tag === "polygon") ctx.closePath();
    }
    ctx.stroke();
  }
}

/** Draw a sticker centred on the current origin. */
export function drawSticker(
  ctx: CanvasRenderingContext2D,
  s: Sticker,
  scale: number,
  assets: Record<string, CanvasImageSource & { width: number; height: number }>,
) {
  const { w: pw, h: ph } = stickerSize(s, assets);
  const w = pw * scale;
  const h = ph * scale;
  ctx.globalAlpha = s.opacity / 100;

  if (s.kind === "emoji") {
    ctx.font = `${w * 0.86}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.value, 0, h * 0.04);
  } else if (s.kind === "icon") {
    const node = STICKER_ICONS[s.value];
    if (!node) return;
    ctx.save();
    ctx.translate(-w / 2, -h / 2);
    ctx.scale(w / 24, h / 24);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    traceIcon(ctx, node);
    ctx.restore();
  } else {
    const img = assets[s.value];
    if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}
