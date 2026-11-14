import { DEFAULT_FILL, DEFAULT_STATE, type PostState, type ShapeId, type Sticker, type TextLayer } from "./types";
import type { BrandKit } from "./brand";

/**
 * Ready-made designs. Each template is a layout (where things go) filled with a category's
 * words and a palette. Colours and fonts are written as roles ($b background, $p primary,
 * $a accent, $t text, $h heading font, $d body font) so a brand kit can restyle them.
 * Photo slots are empty frames: the user clicks one and chooses a photo.
 */
type Palette = { b: string; b2?: string; p: string; a: string; t: string };
type Copy = { title: string; sub: string; small: string; badge: string; sinhala?: boolean };
type Item = { text?: Partial<TextLayer> & { text: string }; shape?: Partial<Sticker> };

export type TemplateCategory = "opening" | "sale" | "new" | "hours" | "thanks" | "festival" | "food" | "events" | "quotes" | "social";
export type TemplateSize = "square" | "feed" | "story";
export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  /** The size it was designed at; every layout also scales to the other sizes. */
  size: TemplateSize;
  palette: Palette;
  heading: string;
  body: string;
  /** The layout's items for a post `h` times as tall as it is wide. */
  make: (h: number) => Item[];
};

export const TEMPLATE_SIZES: { id: TemplateSize; label: string; aspect: number }[] = [
  { id: "square", label: "Square 1:1", aspect: 1 },
  { id: "feed", label: "Feed 4:5", aspect: 0.8 },
  { id: "story", label: "Story 9:16", aspect: 9 / 16 },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "opening", label: "Grand opening" },
  { id: "sale", label: "Sale" },
  { id: "new", label: "New arrival" },
  { id: "food", label: "Food and menu" },
  { id: "hours", label: "Opening hours" },
  { id: "thanks", label: "Thank you" },
  { id: "festival", label: "Festivals" },
  { id: "events", label: "Events and days" },
  { id: "quotes", label: "Quotes" },
  { id: "social", label: "Social and photos" },
];

/* --------------------------------------------------------------- building */

const txt = (text: string, o: Partial<TextLayer> = {}): Item => ({
  text: { text, fontFamily: "$h", fontWeight: 400, fontSize: 96, color: "$t", uppercase: false, letterSpacing: 0, lineHeight: 1.08, width: 0.84, ...o },
});
const shape = (o: Partial<Sticker>): Item => ({ shape: { kind: "shape", rotation: 0, opacity: 100, strokeWidth: 0, ...o } });
const frame = (o: Partial<Sticker>): Item => ({
  shape: { kind: "frame", rotation: 0, opacity: 100, strokeWidth: 0, color: "#d9dbe1", photo: null, pan: { x: 0, y: 0, zoom: 1 }, ...o },
});

/** Layouts, on a 1080-wide post. `h` is the post's height / width (1 for square, 1.25 for 4:5). */
const LAYOUTS: Record<string, (c: Copy, h: number) => Item[]> = {
  bold: (c) => [
    shape({ shape: "burst", value: "burst", x: 0.8, y: 0.17, size: 260, color: "$a", fill: "$a" }),
    txt(c.badge, { x: 0.8, y: 0.17, fontSize: 40, color: "$b", width: 0.2, fontFamily: "$d", fontWeight: 700, rotation: -10 }),
    txt(c.title, { x: 0.5, y: 0.47, fontSize: c.sinhala ? 104 : 150, uppercase: !c.sinhala, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    txt(c.sub, { x: 0.5, y: 0.66, fontSize: 52, fontFamily: "$d", fontWeight: 700 }),
    txt(c.small, { x: 0.5, y: 0.86, fontSize: 34, fontFamily: "$d", fontWeight: 500, width: 0.8 }),
  ],
  split: (c) => [
    frame({ shape: "rounded", value: "rounded", x: 0.28, y: 0.5, size: 500, aspect: 0.62, radius: 18 }),
    txt(c.title, { x: 0.74, y: 0.36, fontSize: c.sinhala ? 66 : 96, uppercase: !c.sinhala, color: "$p", width: 0.44, fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    txt(c.sub, { x: 0.74, y: 0.62, fontSize: 40, fontFamily: "$d", fontWeight: 700, width: 0.42 }),
    txt(c.small, { x: 0.74, y: 0.8, fontSize: 28, fontFamily: "$d", fontWeight: 500, width: 0.42 }),
    shape({ shape: "line", value: "line", x: 0.74, y: 0.52, size: 140, aspect: 30, color: "$a", fill: "$a" }),
  ],
  circle: (c, h) => [
    shape({ shape: "circle", value: "circle", x: 0.5, y: 0.34 / h + 0.02, size: 640, color: "$a", fill: "$a", opacity: 35 }),
    frame({ shape: "circle", value: "circle", x: 0.5, y: 0.34 / h + 0.02, size: 560 }),
    txt(c.title, { x: 0.5, y: 0.76, fontSize: c.sinhala ? 74 : 104, uppercase: !c.sinhala, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    txt(c.sub, { x: 0.5, y: 0.88, fontSize: 40, fontFamily: "$d", fontWeight: 600 }),
  ],
  arch: (c) => [
    frame({ shape: "arch", value: "arch", x: 0.5, y: 0.4, size: 600, aspect: 0.8, strokeWidth: 10, stroke: "$a" }),
    txt(c.title, { x: 0.5, y: 0.84, fontSize: c.sinhala ? 62 : 86, uppercase: !c.sinhala, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    txt(c.sub, { x: 0.5, y: 0.93, fontSize: 32, fontFamily: "$d", fontWeight: 600 }),
  ],
  banner: (c, h) => [
    frame({ shape: "square", value: "square", x: 0.5, y: 0.32 / h, size: 1080, aspect: 1.6 / h }),
    shape({ shape: "square", value: "square", x: 0.5, y: 1 - 0.19 / h, size: 1080, aspect: 2.84 / h, color: "$p", fill: "$p" }),
    txt(c.title, { x: 0.5, y: 1 - 0.23 / h, fontSize: c.sinhala ? 70 : 100, uppercase: !c.sinhala, color: "$b", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    txt(c.sub, { x: 0.5, y: 1 - 0.11 / h, fontSize: 38, color: "$b", fontFamily: "$d", fontWeight: 600 }),
    shape({ shape: "burst", value: "burst", x: 0.84, y: 0.6 / h, size: 220, color: "$a", fill: "$a" }),
    txt(c.badge, { x: 0.84, y: 0.6 / h, fontSize: 34, color: "$b", width: 0.18, fontFamily: "$d", fontWeight: 800, rotation: -8 }),
  ],
  sale: (c) => [
    shape({ shape: "circle", value: "circle", x: 0.5, y: 0.42, size: 700, color: "$a", fill: "$a", opacity: 22 }),
    txt(c.badge, { x: 0.5, y: 0.36, fontSize: 250, uppercase: true, color: "$p", width: 0.9, lineHeight: 0.95 }),
    txt(c.title, { x: 0.5, y: 0.6, fontSize: 92, uppercase: true, letterSpacing: 6 }),
    txt(c.sub, { x: 0.5, y: 0.76, fontSize: 40, color: "$b", fontFamily: "$d", fontWeight: 700, fill: { ...DEFAULT_FILL, mode: "box", color: "$p", radius: 100, padding: 60 } }),
    txt(c.small, { x: 0.5, y: 0.9, fontSize: 30, fontFamily: "$d", fontWeight: 500 }),
  ],
  quote: (c) => [
    shape({ shape: "line", value: "line", x: 0.5, y: 0.26, size: 200, aspect: 40, color: "$a", fill: "$a" }),
    txt(c.title, { x: 0.5, y: 0.45, fontSize: c.sinhala ? 88 : 130, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "Pacifico", fontWeight: c.sinhala ? 800 : 400, lineHeight: 1.2 }),
    txt(c.sub, { x: 0.5, y: 0.66, fontSize: 40, fontFamily: "$d", fontWeight: 500, width: 0.7, lineHeight: 1.35 }),
    shape({ shape: "line", value: "line", x: 0.5, y: 0.78, size: 200, aspect: 40, color: "$a", fill: "$a" }),
    txt(c.small, { x: 0.5, y: 0.86, fontSize: 30, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 8 }),
  ],
  price: (c) => [
    frame({ shape: "circle", value: "circle", x: 0.5, y: 0.33, size: 500, strokeWidth: 14, stroke: "$a" }),
    txt(c.title, { x: 0.5, y: 0.66, fontSize: c.sinhala ? 64 : 90, uppercase: !c.sinhala, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$h", fontWeight: c.sinhala ? 800 : 400 }),
    shape({ shape: "ticket", value: "ticket", x: 0.5, y: 0.83, size: 420, aspect: 2.6, color: "$a", fill: "$a" }),
    txt(c.badge, { x: 0.5, y: 0.83, fontSize: 64, color: "$b", fontFamily: "$h", width: 0.36 }),
  ],
  hours: (c) => [
    txt(c.title, { x: 0.5, y: 0.2, fontSize: 110, uppercase: true, color: "$p" }),
    shape({ shape: "rounded", value: "rounded", x: 0.5, y: 0.58, size: 820, aspect: 1.55, radius: 12, color: "$a", fill: "$a", opacity: 18 }),
    txt(c.sub, { x: 0.5, y: 0.58, fontSize: 48, fontFamily: "$d", fontWeight: 600, lineHeight: 1.7, width: 0.7 }),
    txt(c.small, { x: 0.5, y: 0.9, fontSize: 30, fontFamily: "$d", fontWeight: 500 }),
  ],
  festival: (c) => [
    shape({ shape: "star", value: "star", x: 0.14, y: 0.14, size: 110, color: "$a", fill: "$a" }),
    shape({ shape: "star", value: "star", x: 0.86, y: 0.22, size: 70, color: "$a", fill: "$a" }),
    shape({ shape: "star", value: "star", x: 0.2, y: 0.86, size: 80, color: "$a", fill: "$a" }),
    shape({ shape: "star", value: "star", x: 0.84, y: 0.82, size: 120, color: "$a", fill: "$a" }),
    txt(c.title, { x: 0.5, y: 0.44, fontSize: c.sinhala ? 92 : 120, color: "$p", fontFamily: c.sinhala ? "Noto Sans Sinhala" : "Pacifico", fontWeight: c.sinhala ? 800 : 400, lineHeight: 1.25, effect: { type: "glow", amount: 35, color: "$a" } }),
    txt(c.sub, { x: 0.5, y: 0.68, fontSize: 42, fontFamily: "$d", fontWeight: 600, width: 0.74 }),
    txt(c.small, { x: 0.5, y: 0.78, fontSize: 30, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 6 }),
  ],
};

const PALETTES: Record<string, Palette> = {
  sunset: { b: "#fff4ec", p: "#e8492c", a: "#ffb000", t: "#2b1a12" },
  midnight: { b: "#0f1530", b2: "#22306b", p: "#ffd23f", a: "#ff4fa3", t: "#ffffff" },
  mint: { b: "#e9f8f1", p: "#0f7b5a", a: "#3ad29f", t: "#123b2e" },
  berry: { b: "#2a0e3d", b2: "#5b1d8a", p: "#ffffff", a: "#ff4f8b", t: "#f2e6ff" },
  cream: { b: "#f6efe4", p: "#7a3e1d", a: "#d98c3a", t: "#3a2416" },
  ocean: { b: "#e8f4fb", p: "#0b5d8c", a: "#00b4d8", t: "#0c2c40" },
  ruby: { b: "#fff1f2", p: "#c1121f", a: "#ff6b6b", t: "#3b0a0e" },
  gold: { b: "#111111", b2: "#2a2210", p: "#e9c46a", a: "#f4a261", t: "#ffffff" },
};

const COPY: Partial<Record<TemplateCategory, Copy[]>> = {
  opening: [
    { title: "Grand opening", sub: "This Saturday · 10 am", small: "No. 12, Main Street · Free gifts for the first 50", badge: "NEW" },
    { title: "We're open!", sub: "Come say hello", small: "Open daily from 9 am", badge: "OPEN" },
    { title: "අලුතින් විවෘත කරයි", sub: "මේ සෙනසුරාදා · පෙ.ව. 10", small: "සියලු දෙනාටම ආරාධනා", badge: "NEW", sinhala: true },
  ],
  sale: [
    { title: "Mega sale", sub: "This weekend only", small: "In store and online · While stocks last", badge: "50%" },
    { title: "Flash sale", sub: "Today, 6 – 9 pm", small: "Selected items", badge: "30%" },
    { title: "Season sale", sub: "Up to 40% off", small: "Shop now", badge: "40%" },
  ],
  new: [
    { title: "New arrival", sub: "Just landed in store", small: "Limited stock · Order on WhatsApp", badge: "NEW" },
    { title: "Fresh drop", sub: "The new collection is here", small: "Sizes S – XL", badge: "HOT" },
    { title: "අලුත්ම තොග", sub: "දැන් අපේ සාප්පුවේ", small: "WhatsApp හරහා ඇණවුම් කරන්න", badge: "NEW", sinhala: true },
  ],
  food: [
    { title: "Today's special", sub: "Chicken kottu with a cold drink", small: "Dine in · Takeaway · Delivery", badge: "Rs 950" },
    { title: "Fresh bakes", sub: "Out of the oven every morning", small: "Order before 10 am", badge: "Rs 350" },
  ],
  hours: [
    { title: "Opening hours", sub: "Mon – Fri  9 am – 7 pm\nSaturday  9 am – 5 pm\nSunday  Closed", small: "Call us: 077 123 4567", badge: "" },
    { title: "Holiday hours", sub: "24 Dec  9 am – 2 pm\n25 Dec  Closed\n1 Jan  10 am – 4 pm", small: "Thank you for your support", badge: "" },
  ],
  thanks: [
    { title: "Thank you", sub: "For 1,000 happy customers. We couldn't do it without you.", small: "With love", badge: "" },
    { title: "ස්තූතියි", sub: "ඔබගේ සහයෝගයට හදපිරි ස්තූතිය", small: "Thank you", badge: "", sinhala: true },
  ],
  festival: [
    { title: "සුබ අලුත් අවුරුද්දක් වේවා", sub: "Happy Sinhala & Tamil New Year", small: "From all of us", badge: "", sinhala: true },
    { title: "සුබ වෙසක් මංගල්‍යයක් වේවා", sub: "May the light of Vesak bring you peace", small: "Happy Vesak", badge: "", sinhala: true },
    { title: "Merry Christmas", sub: "Wishing you joy and peace this season", small: "Season's greetings", badge: "" },
    { title: "Eid Mubarak", sub: "Peace, joy and blessings to you and your family", small: "Eid greetings", badge: "" },
    { title: "Happy Deepavali", sub: "May the festival of lights brighten your home", small: "Festival greetings", badge: "" },
  ],
};

/** Which layouts and palettes each category uses, in order (the copy cycles through). */
const PLAN: Partial<Record<TemplateCategory, [string, string, "square" | "feed"][]>> = {
  opening: [["bold", "sunset", "square"], ["banner", "midnight", "feed"], ["circle", "mint", "square"], ["arch", "cream", "feed"], ["bold", "berry", "feed"]],
  sale: [["sale", "ruby", "square"], ["sale", "midnight", "feed"], ["banner", "sunset", "square"], ["bold", "gold", "square"], ["sale", "mint", "square"]],
  new: [["split", "cream", "square"], ["arch", "berry", "feed"], ["circle", "ocean", "square"], ["banner", "mint", "square"], ["bold", "ocean", "feed"]],
  food: [["price", "sunset", "square"], ["price", "cream", "feed"], ["split", "ruby", "square"], ["circle", "gold", "feed"]],
  hours: [["hours", "ocean", "square"], ["hours", "gold", "feed"], ["hours", "cream", "square"]],
  thanks: [["quote", "cream", "square"], ["quote", "berry", "feed"], ["quote", "mint", "square"]],
  festival: [["festival", "gold", "square"], ["festival", "midnight", "feed"], ["festival", "ruby", "square"], ["festival", "berry", "square"], ["festival", "ocean", "feed"], ["festival", "gold", "feed"]],
};

const FONTS: Record<string, [string, string]> = {
  bold: ["Anton", "Montserrat"],
  split: ["Bebas Neue", "Poppins"],
  circle: ["Anton", "Poppins"],
  arch: ["Playfair Display", "Montserrat"],
  banner: ["Anton", "Montserrat"],
  sale: ["Anton", "Montserrat"],
  quote: ["Pacifico", "Poppins"],
  price: ["Bebas Neue", "Montserrat"],
  hours: ["Bebas Neue", "Poppins"],
  festival: ["Pacifico", "Poppins"],
};

/* ---------------------------------------------------- story-style layouts */

// Modelled on the reference stories (layout and mood only, no copied content). Written in px
// on the post's own height (H), so one layout fits 9:16, 4:5 and 1:1.
const ink = "#16181d";
const white = "#ffffff";
const si = (c: Copy, size: number): Partial<TextLayer> =>
  c.sinhala ? { fontFamily: "Noto Sans Sinhala", fontWeight: 800, uppercase: false, fontSize: Math.round(size * 0.68) } : { fontSize: size };
const box = (color: string, radius: number, padding: number) => ({ ...DEFAULT_FILL, mode: "box" as const, color, radius, padding });

const STORY: Record<string, (c: Copy, h: number) => Item[]> = {
  // Full-bleed photo, dark band at the bottom, kicker and a big title.
  poster: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    return [
      frame({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 1080, aspect: 1 / h }),
      shape({ shape: "square", value: "square", x: 0.5, y: Y(H * 0.8), size: 1080, aspect: 1080 / (H * 0.4), color: "#000000", fill: "#000000", opacity: 45 }),
      txt(c.badge, { x: 0.5, y: Y(H - 300), fontSize: 32, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 20, color: "$a" }),
      txt(c.title, { x: 0.5, y: Y(H - 200), uppercase: true, color: white, lineHeight: 1, shadow: true, ...si(c, 110) }),
      txt(c.sub, { x: 0.5, y: Y(H - 90), fontSize: 34, fontFamily: "$d", fontWeight: 500, color: white, shadow: true }),
    ];
  },
  // Full-bleed photo with an outlined box around a stacked title.
  posterBox: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const boxH = H * 0.56;
    return [
      frame({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 1080, aspect: 1 / h }),
      shape({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 1080, aspect: 1 / h, color: "#000000", fill: "#000000", opacity: 30 }),
      shape({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 820, aspect: 820 / boxH, color: white, fill: "none", stroke: white, strokeWidth: 8 }),
      txt(c.badge, { x: 0.5, y: Y(H / 2 - boxH / 2 + 70), fontSize: 30, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 18, color: white }),
      txt(c.title, { x: 0.5, y: 0.5, uppercase: true, color: white, width: 0.62, lineHeight: 0.98, shadow: true, ...si(c, 140) }),
      txt(c.sub, { x: 0.5, y: Y(H / 2 + boxH / 2 - 70), fontSize: 32, fontFamily: "$d", fontWeight: 600, color: white, width: 0.66 }),
    ];
  },
  // Photo on top, a card overlapping it with a quote and a name tag.
  quoteCard: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const k = h > 1.5 ? 1 : 0.8;
    return [
      frame({ shape: "square", value: "square", x: 0.5, y: Y(H * 0.32), size: 1080, aspect: 1080 / (H * 0.64) }),
      shape({ shape: "square", value: "square", x: 0.5, y: Y(H * 0.7), size: 820, aspect: 820 / (H * 0.32), color: "$b", fill: "$b" }),
      txt(c.title, { x: 0.5, y: Y(H * 0.68), uppercase: !c.sinhala, color: "$t", width: 0.68, lineHeight: 1.05, ...si(c, 84 * k) }),
      txt(c.small, { x: 0.5, y: Y(H * 0.83), fontSize: 24, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 12, color: "$b", fill: box("$t", 0, 40) }),
    ];
  },
  // Inset photo on a bright background, words over a dark band.
  motivation: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const ph = H - 180;
    return [
      frame({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 900, aspect: 900 / ph }),
      shape({ shape: "square", value: "square", x: 0.5, y: Y(H - 90 - ph * 0.13), size: 900, aspect: 900 / (ph * 0.26), color: "#000000", fill: "#000000", opacity: 50 }),
      txt(c.title, { x: 0.5, y: Y(H - 90 - ph * 0.15), uppercase: true, color: white, width: 0.76, lineHeight: 1, ...si(c, h > 1.5 ? 92 : 64) }),
      txt(c.small, { x: 0.5, y: Y(H - 90 - ph * 0.04), fontSize: 26, fontFamily: "$d", fontWeight: 500, color: white }),
    ];
  },
  // A social-media style card with a centred avatar and a quote.
  tweet: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const cardH = 560;
    const top = H / 2 - cardH / 2;
    return [
      shape({ shape: "rounded", value: "rounded", x: 0.5, y: 0.5, size: 880, aspect: 880 / cardH, radius: 14, color: white, fill: white }),
      frame({ shape: "circle", value: "circle", x: 0.5, y: Y(top), size: 150, strokeWidth: 10, stroke: white }),
      txt(c.badge, { x: 0.5, y: Y(top + 115), fontSize: 34, fontFamily: "$d", fontWeight: 700, color: ink }),
      txt(c.small, { x: 0.5, y: Y(top + 160), fontSize: 26, fontFamily: "$d", fontWeight: 500, color: "#6b7280" }),
      txt(c.title, { x: 0.5, y: Y(top + 320), color: ink, width: 0.7, lineHeight: 1.3, fontFamily: c.sinhala ? "Noto Sans Sinhala" : "$d", fontWeight: c.sinhala ? 700 : 500, fontSize: c.sinhala ? 40 : 46 }),
      txt(c.sub, { x: 0.5, y: Y(top + cardH - 60), fontSize: 26, fontFamily: "$d", fontWeight: 600, color: "$p" }),
    ];
  },
  // A phone-post mockup: header, square photo, like and share icons.
  postcard: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const cardH = Math.min(1000, H * 0.74);
    const top = H * 0.52 - cardH / 2;
    const photoH = cardH - 300;
    const icon = (x: number, s: ShapeId) =>
      shape({ shape: s, value: s, x, y: Y(top + cardH - 55), size: 46, color: ink, fill: s === "heart" ? "#e0475b" : "none", stroke: s === "heart" ? "#e0475b" : ink, strokeWidth: 5 });
    return [
      txt(c.title, { x: 0.5, y: Y(top - 80), color: "$t", fontSize: 110, lineHeight: 1, ...(c.sinhala ? si(c, 110) : {}) }),
      shape({ shape: "rounded", value: "rounded", x: 0.5, y: Y(top + cardH / 2), size: 820, aspect: 820 / cardH, radius: 8, color: white, fill: white }),
      frame({ shape: "circle", value: "circle", x: 0.5, y: Y(top + 70), size: 84 }),
      txt(c.badge, { x: 0.5, y: Y(top + 140), fontSize: 26, fontFamily: "$d", fontWeight: 600, color: ink }),
      frame({ shape: "square", value: "square", x: 0.5, y: Y(top + 180 + photoH / 2), size: 720, aspect: 720 / photoH }),
      icon(0.21, "heart"),
      icon(0.29, "bubble"),
      icon(0.37, "arrow"),
      txt(c.sub, { x: 0.68, y: Y(top + cardH + 10), color: "$p", fontFamily: "Great Vibes", fontSize: 120, width: 0.5 }),
      ...(h > 1.5 ? [txt(c.small, { x: 0.5, y: Y(H - 110), fontSize: 26, fontFamily: "$d", fontWeight: 500, color: "$t", letterSpacing: 10 })] : []),
    ];
  },
  // Product on a podium with a discount badge and a button.
  podium: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const photoH = H * 0.34;
    const cy = H * 0.47;
    return [
      txt(c.title, { x: 0.5, y: Y(H * 0.13), uppercase: true, color: "$t", lineHeight: 1, ...si(c, 110) }),
      txt(c.sub, { x: 0.5, y: Y(H * 0.13 + 95), fontSize: 36, fontFamily: "$d", fontWeight: 500, color: "$t" }),
      frame({ shape: "rounded", value: "rounded", x: 0.5, y: Y(cy), size: 600, aspect: 600 / photoH, radius: 10 }),
      shape({ shape: "square", value: "square", x: 0.5, y: Y(cy + photoH / 2 + 95), size: 640, aspect: 640 / 150, color: "#e9e9ec", fill: "#e9e9ec" }),
      shape({ shape: "circle", value: "circle", x: 0.5, y: Y(cy + photoH / 2 + 170), size: 640, aspect: 640 / 100, color: "#e9e9ec", fill: "#e9e9ec" }),
      shape({ shape: "circle", value: "circle", x: 0.5, y: Y(cy + photoH / 2 + 20), size: 640, aspect: 640 / 100, color: white, fill: white }),
      shape({ shape: "burst", value: "burst", x: 0.76, y: Y(cy - photoH / 2 + 40), size: 200, color: "$p", fill: "$p" }),
      txt(c.badge, { x: 0.76, y: Y(cy - photoH / 2 + 40), fontSize: 50, color: white, fontFamily: "$h", width: 0.16, rotation: -8 }),
      txt(c.small, { x: 0.5, y: Y(H * 0.84), fontSize: 30, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 8, color: white, fill: box("$p", 100, 70) }),
    ];
  },
  // Big title on a solid colour, a rounded photo with a white border, a pill button.
  showcase: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const photoH = H * 0.42;
    return [
      txt(c.title, { x: 0.5, y: Y(H * 0.15), color: "$t", width: 0.82, lineHeight: 0.95, ...si(c, 130) }),
      frame({ shape: "rounded", value: "rounded", x: 0.5, y: Y(H * 0.52), size: 700, aspect: 700 / photoH, radius: 40, strokeWidth: 16, stroke: white }),
      txt(c.sub, { x: 0.5, y: Y(H * 0.52 + photoH / 2 + 110), fontSize: 32, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 8, color: "$b", fill: box("$t", 20, 60) }),
      txt(c.small, { x: 0.5, y: Y(H - 70), fontSize: 24, fontFamily: "$d", fontWeight: 500, letterSpacing: 10, color: "$t" }),
    ];
  },
  // Three price cards stacked; the middle one in the brand colour. `sub` holds "price|name" lines.
  prices: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const cardH = Math.min(320, (H * 0.68) / 3 - 30);
    const top = Math.max(H * 0.16, (H - 3 * cardH - 60) / 2 + 20);
    return [
      txt(c.title, { x: 0.5, y: Y(top - 80), color: "$t", ...si(c, 64) }),
      ...c.sub.split("\n").slice(0, 3).flatMap((line, i) => {
        const [price, name = ""] = line.split("|");
        const cy = top + i * (cardH + 30) + cardH / 2;
        const on = i === 1;
        return [
          shape({ shape: "rounded", value: "rounded", x: 0.5, y: Y(cy), size: 760, aspect: 760 / cardH, radius: 12, color: on ? "$p" : white, fill: on ? "$p" : white }),
          txt(price, { x: 0.4, y: Y(cy - 22), fontSize: Math.round(cardH * 0.26), color: on ? white : ink, width: 0.42 }),
          txt(name, { x: 0.4, y: Y(cy + cardH * 0.22), fontSize: 28, fontFamily: "$d", fontWeight: 500, color: on ? white : ink, width: 0.42 }),
          frame({ shape: "rounded", value: "rounded", x: (890 - (cardH - 60) / 2) / 1080, y: Y(cy), size: cardH - 60, radius: 16 }),
        ];
      }),
      txt(c.small, { x: 0.5, y: Y(Math.min(H * 0.92, top + 3 * cardH + 60 + 110)), fontSize: 32, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 4, color: white, fill: box("$p", 30, 70) }),
    ];
  },
  // Polaroid photos with doodle stars.
  polaroids: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const tall = h > 1.5;
    const spots = tall
      ? [0, 1, 2].map((i) => ({ x: 0.5 + (i - 1) * 0.04, y: H * 0.22 + i * H * 0.27, r: [-3, 2, -2][i], s: 480 }))
      : [0, 1].map((i) => ({ x: 0.29 + i * 0.42, y: H * 0.5, r: [-4, 3][i], s: 420 }));
    const star = (x: number, y: number, s: number): Item =>
      shape({ shape: "star", value: "star", x, y: Y(y), size: s, color: "$t", fill: "none", stroke: "$t", strokeWidth: 4 });
    return [
      txt(c.title, { x: 0.5, y: Y(H * 0.05), color: "$t", fontFamily: "Caveat", fontSize: 80, ...(c.sinhala ? si(c, 80) : {}) }),
      ...spots.flatMap((p) => [
        shape({ shape: "square", value: "square", x: p.x, y: Y(p.y), size: p.s, aspect: 0.86, rotation: p.r, color: white, fill: white }),
        frame({ shape: "square", value: "square", x: p.x, y: Y(p.y - p.s * 0.07), size: p.s * 0.88, aspect: 1.2, rotation: p.r }),
      ]),
      star(0.88, tall ? H * 0.34 : H * 0.22, 60),
      star(0.12, tall ? H * 0.6 : H * 0.8, 46),
      star(0.86, tall ? H * 0.82 : H * 0.8, 52),
      txt(c.sub, { x: 0.5, y: Y(H * 0.94), fontSize: 30, fontFamily: "$d", fontWeight: 500, color: "$t", width: 0.7 }),
    ];
  },
  // A month's photo dump: nine small polaroids.
  dump: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const s = Math.min(280, (H * 0.7) / 3 - 40);
    const rot = [-4, 3, -2, 2, -3, 4, -2, 3, -4];
    return [
      txt(c.title, { x: 0.5, y: Y(H * 0.08), color: "$t", fontFamily: "$d", fontWeight: 500, fontSize: 40, ...(c.sinhala ? si(c, 56) : {}) }),
      ...rot.flatMap((r, i) => {
        const x = [0.22, 0.5, 0.78][i % 3];
        const y = H * 0.5 + (Math.floor(i / 3) - 1) * (s * 1.12 + 40);
        return [
          shape({ shape: "square", value: "square", x, y: Y(y), size: s, aspect: 1 / 1.14, rotation: r, color: white, fill: white }),
          frame({ shape: "square", value: "square", x, y: Y(y - s * 0.07), size: s * 0.86, rotation: r }),
        ];
      }),
      txt(c.sub, { x: 0.5, y: Y(H * 0.93), color: "$t", fontFamily: "Caveat", fontSize: 64 }),
    ];
  },
  // "new drop": a huge word, a hanger line and the product.
  drop: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const photoH = H * 0.46;
    return [
      txt(c.title, { x: 0.5, y: Y(H * 0.14), color: "$p", width: 0.9, lineHeight: 0.8, ...si(c, h >= 1.25 ? 200 : 150) }),
      shape({ shape: "line", value: "line", x: 0.5, y: Y(H * 0.29 - 10), size: 110, aspect: 30, rotation: 90, color: "$t", fill: "$t" }),
      frame({ shape: "rounded", value: "rounded", x: 0.5, y: Y(H * 0.29 + 45 + photoH / 2), size: 620, aspect: 620 / photoH, radius: 8 }),
      txt(c.sub, { x: 0.5, y: Y(H * 0.86), fontSize: 28, fontFamily: "$d", fontWeight: 700, uppercase: true, letterSpacing: 4, color: "$p", width: 0.6 }),
      txt(c.small, { x: 0.5, y: Y(H * 0.93), fontSize: 24, fontFamily: "$d", fontWeight: 500, color: "$p" }),
    ];
  },
  // Outlined words repeated behind a tall product photo.
  outNow: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const n = Math.max(4, Math.floor((H - 160) / 190));
    return [
      ...Array.from({ length: n }, (_, i) =>
        txt(c.title, { x: 0.5, y: Y(110 + (i + 0.5) * ((H - 220) / n)), fontSize: 150, uppercase: true, color: "$a", width: 1, effect: { type: "hollow", amount: 30, color: "$a" } }),
      ),
      frame({ shape: "rounded", value: "rounded", x: 0.5, y: 0.5, size: 360, aspect: 360 / (H * 0.5), radius: 40 }),
      txt(c.small, { x: 0.5, y: Y(H - 60), fontSize: 24, fontFamily: "$d", fontWeight: 600, letterSpacing: 10, uppercase: true, color: "$t" }),
    ];
  },
  // A clipped paper sheet with a product photo and a short description.
  clipboard: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const paperH = H * 0.7;
    const top = H * 0.5 - paperH / 2;
    return [
      shape({ shape: "square", value: "square", x: 0.5, y: 0.5, size: 820, aspect: 820 / paperH, color: "$p", fill: "$p" }),
      shape({ shape: "u-shape", value: "u-shape", x: 0.5, y: Y(top - 45), size: 110, rotation: 180, color: "$a", fill: "none", stroke: "$a", strokeWidth: 12 }),
      shape({ shape: "rounded", value: "rounded", x: 0.5, y: Y(top), size: 220, aspect: 220 / 70, radius: 40, color: "$a", fill: "$a" }),
      txt(c.badge, { x: 0.3, y: Y(top + 80), fontSize: 22, fontFamily: "Inter", fontWeight: 600, uppercase: true, letterSpacing: 10, color: ink, width: 0.3 }),
      txt(c.title, { x: 0.7, y: Y(top + 80), fontSize: 22, fontFamily: "Inter", fontWeight: 600, uppercase: true, letterSpacing: 10, color: ink, width: 0.3 }),
      frame({ shape: "square", value: "square", x: 0.5, y: Y(top + 130 + paperH * 0.24), size: 640, aspect: 640 / (paperH * 0.48) }),
      txt(c.sub, { x: 0.5, y: Y(top + paperH * 0.86), fontSize: c.sinhala ? 26 : 28, fontFamily: c.sinhala ? "Noto Sans Sinhala" : "Inter", fontWeight: 400, lineHeight: 1.5, width: 0.62, color: ink }),
      txt(c.small, { x: 0.5, y: Y(H - 70), fontSize: 24, fontFamily: "$d", fontWeight: 500, color: "$t", letterSpacing: 6 }),
    ];
  },
  // A bright holiday card: sky, green hills, clouds and a big emoji.
  holiday: (c, h) => {
    const H = 1080 * h;
    const Y = (v: number) => v / H;
    const cloud = (x: number, y: number, s: number): Item[] => [
      shape({ shape: "circle", value: "circle", x, y: Y(y), size: s, color: white, fill: white, opacity: 90 }),
      shape({ shape: "circle", value: "circle", x: x + s / 1700, y: Y(y + s * 0.12), size: s * 0.75, color: white, fill: white, opacity: 90 }),
      shape({ shape: "circle", value: "circle", x: x - s / 1700, y: Y(y + s * 0.16), size: s * 0.65, color: white, fill: white, opacity: 90 }),
    ];
    return [
      ...cloud(0.14, H * 0.05, 170),
      ...cloud(0.88, H * 0.42, 130),
      shape({ shape: "circle", value: "circle", x: 0.15, y: Y(H + 560), size: 1700, color: "#8fd14f", fill: "#8fd14f" }),
      shape({ shape: "circle", value: "circle", x: 0.75, y: Y(H + 640), size: 1900, color: "#5bb83a", fill: "#5bb83a" }),
      txt(c.title, { x: 0.5, y: Y(H * 0.17), color: "$p", width: 0.86, lineHeight: 1, ...si(c, 130) }),
      txt(c.sub, { x: 0.5, y: Y(H * 0.17 + (c.sinhala ? 140 : 160)), fontSize: 36, fontFamily: "$d", fontWeight: 600, color: "$t", width: 0.76 }),
      shape({ kind: "emoji", value: c.badge, x: 0.5, y: Y(Math.min(H - 500, H * 0.6)), size: h > 1.5 ? 620 : 440 }),
      txt(c.small, { x: 0.5, y: Y(H - 80), fontSize: 28, fontFamily: "$d", fontWeight: 700, color: white, letterSpacing: 6 }),
    ];
  },
};

const STORY_PALETTES: Record<string, Palette> = {
  lime: { b: "#b6f23a", p: "#111111", a: "#111111", t: "#111111" },
  blush: { b: "#fdeef0", b2: "#f9d3da", p: "#e0475b", a: "#f7a1ae", t: "#3a1d24" },
  forest: { b: "#2f7a5c", p: "#ffffff", a: "#a8e6c9", t: "#ffffff" },
  peach: { b: "#fdeee4", p: "#c8102e", a: "#f28c28", t: "#c8102e" },
  coral: { b: "#f6b2a5", b2: "#d9606d", p: "#ffffff", a: "#ffe1d6", t: "#ffffff" },
  paper: { b: "#f4f2ee", p: "#111111", a: "#111111", t: "#222222" },
  sky: { b: "#35b6f0", b2: "#dff5ff", p: "#e8467c", a: "#ffcc33", t: "#1b4b6b" },
  sand: { b: "#ece6e1", p: "#1d9a4b", a: "#1d9a4b", t: "#1f2a24" },
  charcoal: { b: "#1b1b1b", p: "#f3efe6", a: "#9aa0a6", t: "#ffffff" },
  night: { b: "#101010", p: "#ffffff", a: "#ffcc33", t: "#ffffff" },
};

const STORY_FONTS: Record<string, [string, string]> = {
  poster: ["Anton", "Montserrat"],
  posterBox: ["Bebas Neue", "Montserrat"],
  quoteCard: ["Playfair Display", "Montserrat"],
  motivation: ["Oswald", "Poppins"],
  tweet: ["Poppins", "Poppins"],
  postcard: ["Playfair Display", "Poppins"],
  podium: ["Archivo Black", "Poppins"],
  showcase: ["Archivo Black", "Montserrat"],
  prices: ["Archivo Black", "Poppins"],
  polaroids: ["Caveat", "Poppins"],
  dump: ["Poppins", "Poppins"],
  drop: ["Abril Fatface", "Montserrat"],
  outNow: ["Archivo Black", "Montserrat"],
  clipboard: ["Inter", "Montserrat"],
  holiday: ["Fredoka", "Nunito"],
};

type Size = TemplateSize;
const S = (category: TemplateCategory, layout: string, palette: string, size: Size, copy: Copy) => ({ category, layout, palette, size, copy });

/** Templates with their own words: category, layout, palette, size, copy. */
const STORY_PLAN = [
  S("events", "poster", "night", "story", { title: "World Wildlife Day", sub: "Protect what you love", small: "", badge: "3 March" }),
  S("events", "posterBox", "night", "story", { title: "Happy World Wildlife Day", sub: "From all of us at your shop", small: "", badge: "3 March" }),
  S("events", "poster", "sunset", "feed", { title: "Live music night", sub: "Friday · 7 pm · Free entry", small: "", badge: "This week" }),
  S("events", "posterBox", "gold", "square", { title: "Workshop", sub: "Saturday 10 am · Limited seats", small: "", badge: "Join us" }),
  S("events", "poster", "night", "story", { title: "ලෝක වනජීවී දිනය", sub: "World Wildlife Day", small: "", badge: "මාර්තු 3", sinhala: true }),
  S("opening", "posterBox", "night", "story", { title: "Now open", sub: "No. 12, Main Street · 9 am – 9 pm", small: "", badge: "Grand opening" }),
  S("opening", "showcase", "berry", "story", { title: "We're open", sub: "Visit us today", small: "yourshop.lk", badge: "" }),

  S("quotes", "quoteCard", "cream", "story", { title: "“Fashion fades, style stays.”", sub: "", small: "Your shop", badge: "" }),
  S("quotes", "motivation", "lime", "story", { title: "Just keep moving forward", sub: "", small: "yourgym.lk", badge: "" }),
  S("quotes", "tweet", "blush", "story", { title: "“Live comfortably in a complicated world.”", sub: "#quoteoftheday", small: "@yourshop", badge: "Your name" }),
  S("quotes", "quoteCard", "mint", "feed", { title: "“Small steps every day.”", sub: "", small: "Monday motivation", badge: "" }),
  S("quotes", "motivation", "sunset", "square", { title: "Stronger every day", sub: "", small: "yourgym.lk", badge: "" }),
  S("quotes", "tweet", "ocean", "square", { title: "“Good things take time.”", sub: "#tipoftheday", small: "@yourshop", badge: "Your name" }),
  S("thanks", "quoteCard", "berry", "story", { title: "“සතුට බෙදන තරමට වැඩි වේ.”", sub: "", small: "Thank you", badge: "", sinhala: true }),

  S("social", "postcard", "cream", "story", { title: "New", sub: "Post.", small: "LIKE · COMMENT · SHARE", badge: "@yourshop" }),
  S("social", "polaroids", "paper", "story", { title: "Best day ever", sub: "Thank you for coming!", small: "", badge: "" }),
  S("social", "dump", "paper", "story", { title: "December", sub: "photo dump", small: "", badge: "" }),
  S("social", "postcard", "blush", "feed", { title: "New", sub: "Post.", small: "", badge: "@yourshop" }),
  S("social", "polaroids", "cream", "square", { title: "Behind the scenes", sub: "A day at our shop", small: "", badge: "" }),
  S("social", "dump", "blush", "feed", { title: "මේ මාසේ මතකයන්", sub: "photo dump", small: "", badge: "", sinhala: true }),

  S("new", "podium", "paper", "story", { title: "New arrival", sub: "Casual shoes", small: "Order now", badge: "40%" }),
  S("new", "showcase", "forest", "story", { title: "New Product", sub: "Order now", small: "yourshop.lk", badge: "" }),
  S("new", "drop", "peach", "story", { title: "new drop", sub: "Our newest shirt collection has arrived", small: "@yourshop", badge: "" }),
  S("new", "outNow", "coral", "story", { title: "Out now", sub: "", small: "yourshop.lk", badge: "" }),
  S("new", "clipboard", "charcoal", "story", { title: "Spring 2026", sub: "Made for everyday elegance: soft leather, timeless style and room for everything.", small: "@yourshop", badge: "Your brand" }),
  S("new", "podium", "ocean", "feed", { title: "Just in", sub: "Summer collection", small: "Shop now", badge: "NEW" }),
  S("new", "showcase", "ruby", "square", { title: "අලුත්ම නිෂ්පාදනය", sub: "Order now", small: "yourshop.lk", badge: "", sinhala: true }),

  S("sale", "prices", "sand", "story", { title: "Skin care", sub: "Rs 2,950|Face oil serum\nRs 3,190|Cleansing gel\nRs 3,990|Day cream", small: "Shop now", badge: "" }),
  S("sale", "podium", "blush", "story", { title: "Big sale", sub: "This weekend only", small: "Shop now", badge: "50%" }),
  S("sale", "outNow", "midnight", "feed", { title: "Sale", sub: "", small: "Up to 50% off", badge: "" }),
  S("sale", "prices", "ruby", "feed", { title: "Deals of the week", sub: "Rs 990|T-shirts\nRs 1,490|Shorts\nRs 2,490|Hoodies", small: "Order on WhatsApp", badge: "" }),

  S("food", "prices", "cream", "story", { title: "Today's menu", sub: "Rs 850|Chicken kottu\nRs 650|Egg fried rice\nRs 450|Iced coffee", small: "Order now", badge: "" }),
  S("food", "drop", "sunset", "feed", { title: "fresh bakes", sub: "Out of the oven every morning", small: "@yourbakery", badge: "" }),

  S("festival", "holiday", "sky", "story", { title: "Happy Easter", sub: "Wishing you a joyful season", small: "From all of us", badge: "🐰" }),
  S("festival", "holiday", "sky", "story", { title: "Children's Day", sub: "Let them read, play and dream", small: "1 October", badge: "📚" }),
  S("festival", "holiday", "sky", "square", { title: "සුබ අලුත් අවුරුද්දක්", sub: "Happy New Year", small: "From all of us", badge: "🪔", sinhala: true }),
  S("festival", "holiday", "sky", "feed", { title: "Merry Christmas", sub: "Joy and peace to you and yours", small: "Season's greetings", badge: "🎄" }),

  S("hours", "hours", "ocean", "story", { title: "Opening hours", sub: "Mon – Fri  9 am – 7 pm\nSaturday  9 am – 5 pm\nSunday  Closed", small: "Call us: 077 123 4567", badge: "" }),
];

const heightOf = (size: Size) => (size === "story" ? 16 / 9 : size === "feed" ? 1.25 : 1);

/**
 * The first layouts place things as fractions of the height, which drift apart on tall posts.
 * Taller than 4:5, build them at 4:5 and centre that design vertically. Banners already anchor
 * to the top and bottom edges, so they stretch.
 */
const legacy = (layout: string, copy: Copy) => (h: number) => {
  if (h <= 1.25 || layout === "banner") return LAYOUTS[layout](copy, h);
  const y = (v: number | undefined) => (v === undefined ? v : 0.5 + ((v - 0.5) * 1.25) / h);
  return LAYOUTS[layout](copy, 1.25).map((it) => (it.text ? { text: { ...it.text, y: y(it.text.y) } } : { shape: { ...it.shape, y: y(it.shape?.y) } }));
};

export const TEMPLATES: Template[] = [
  ...(Object.keys(PLAN) as TemplateCategory[]).flatMap((category) =>
    PLAN[category]!.map(([layout, palette, size], i) => {
      const copy = COPY[category]![i % COPY[category]!.length];
      return {
        id: `${category}-${i + 1}`,
        name: copy.title,
        category,
        size,
        palette: PALETTES[palette],
        heading: FONTS[layout][0],
        body: FONTS[layout][1],
        make: legacy(layout, copy),
      };
    }),
  ),
  ...STORY_PLAN.map(({ category, layout, palette, size, copy }, i) => ({
    id: `${layout}-${i + 1}`,
    name: copy.title.replace(/[“”"]/g, ""),
    category,
    size,
    palette: STORY_PALETTES[palette] ?? PALETTES[palette],
    heading: (STORY_FONTS[layout] ?? FONTS[layout])[0],
    body: (STORY_FONTS[layout] ?? FONTS[layout])[1],
    make: STORY[layout] ? (h: number) => STORY[layout](copy, h) : legacy(layout, copy),
  })),
];

/* ---------------------------------------------------------------- applying */

/**
 * Turn a template into a design. With a brand kit, its colours replace the template's primary
 * and accent colours and its fonts replace the template's fonts.
 */
export function templateState(t: Template, brand?: BrandKit | null, media: "photo" | "video" = "photo", size: TemplateSize = t.size): PostState {
  const pal: Palette = { ...t.palette };
  if (brand?.colors.length) {
    pal.p = brand.colors[0];
    if (brand.colors[1]) pal.a = brand.colors[1];
  }
  const heading = brand?.headingFont ?? t.heading;
  const body = brand?.bodyFont ?? t.body;
  const color = (c: string | undefined) => (c && c.startsWith("$") ? (pal[c.slice(1) as keyof Palette] ?? pal.t) : c);
  const font = (f: string | undefined) => (f === "$h" ? heading : f === "$d" ? body : f);

  let z = 0;
  const texts: TextLayer[] = [];
  const stickers: Sticker[] = [];
  for (const it of t.make(heightOf(size))) {
    z++;
    if (it.text) {
      const o = it.text;
      texts.push({
        id: crypto.randomUUID(),
        x: 0.5,
        y: 0.5,
        align: "center",
        shadow: false,
        rotation: 0,
        ...o,
        fontFamily: font(o.fontFamily) ?? heading,
        fontWeight: o.fontWeight ?? 400,
        fontSize: o.fontSize ?? 80,
        color: color(o.color) ?? pal.t,
        uppercase: o.uppercase ?? false,
        letterSpacing: o.letterSpacing ?? 0,
        lineHeight: o.lineHeight ?? 1.1,
        width: o.width ?? 0.84,
        fill: o.fill ? { ...o.fill, color: color(o.fill.color)! } : DEFAULT_FILL,
        effect: o.effect ? { ...o.effect, color: color(o.effect.color)! } : undefined,
        z,
      } as TextLayer);
    } else if (it.shape) {
      const o = it.shape;
      stickers.push({
        id: crypto.randomUUID(),
        x: 0.5,
        y: 0.5,
        size: 300,
        rotation: 0,
        opacity: 100,
        ...o,
        kind: o.kind ?? "shape",
        value: o.value ?? "square",
        color: color(o.color) ?? pal.a,
        fill: color(o.fill),
        stroke: color(o.stroke),
        z,
      } as Sticker);
    }
  }
  return {
    ...DEFAULT_STATE,
    media,
    size,
    background: pal.b2
      ? { kind: "gradient", from: pal.b, to: pal.b2 }
      : { kind: "solid", from: pal.b, to: pal.b },
    texts,
    stickers,
  };
}

/* ------------------------------------------------------------ my templates */

const MINE = "bubble-studio:my-templates";
export type MyTemplate = { id: string; name: string; state: PostState; savedAt: number };

export function readMyTemplates(): MyTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(MINE) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Keep a design as a template. Uploaded photos aren't stored (frames come back empty, ready
 * for a new photo); text, shapes, emoji and the look are kept.
 * shortcut: kept in localStorage (max 12), so no uploaded images; move to IndexedDB to keep them.
 */
export function saveMyTemplate(state: PostState, name: string): boolean {
  const clean: PostState = {
    ...state,
    photoId: null,
    photoName: null,
    video: null,
    music: state.music?.src.startsWith("/") ? state.music : null,
    grid: state.grid ? { ...state.grid, cells: state.grid.cells.map(() => null) } : null,
    crop: null,
    regions: [],
    stickers: state.stickers
      .filter((s) => s.kind !== "image" || s.value.startsWith("custom:"))
      .filter((s) => s.kind !== "gif")
      .map((s) => (s.kind === "frame" ? { ...s, photo: null } : s)),
  };
  const list = [{ id: crypto.randomUUID(), name: name.trim() || "My template", state: clean, savedAt: Date.now() }, ...readMyTemplates()].slice(0, 12);
  try {
    localStorage.setItem(MINE, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function deleteMyTemplate(id: string) {
  try {
    localStorage.setItem(MINE, JSON.stringify(readMyTemplates().filter((t) => t.id !== id)));
  } catch {}
}

/** A saved template with fresh layer ids, ready to edit. */
export function myTemplateState(t: MyTemplate): PostState {
  return {
    ...t.state,
    texts: t.state.texts.map((x) => ({ ...x, id: crypto.randomUUID() })),
    stickers: t.state.stickers.map((x) => ({ ...x, id: crypto.randomUUID() })),
  };
}
