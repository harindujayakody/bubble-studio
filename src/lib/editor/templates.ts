import { DEFAULT_FILL, DEFAULT_STATE, type PostState, type Sticker, type TextLayer } from "./types";
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

export type TemplateCategory = "opening" | "sale" | "new" | "hours" | "thanks" | "festival" | "food";
export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  size: "square" | "feed";
  palette: Palette;
  heading: string;
  body: string;
  items: Item[];
};

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "opening", label: "Grand opening" },
  { id: "sale", label: "Sale" },
  { id: "new", label: "New arrival" },
  { id: "food", label: "Food and menu" },
  { id: "hours", label: "Opening hours" },
  { id: "thanks", label: "Thank you" },
  { id: "festival", label: "Festivals" },
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

const COPY: Record<TemplateCategory, Copy[]> = {
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
const PLAN: Record<TemplateCategory, [string, string, "square" | "feed"][]> = {
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

export const TEMPLATES: Template[] = (Object.keys(PLAN) as TemplateCategory[]).flatMap((category) =>
  PLAN[category].map(([layout, palette, size], i) => {
    const copy = COPY[category][i % COPY[category].length];
    const h = size === "feed" ? 1.25 : 1;
    return {
      id: `${category}-${i + 1}`,
      name: copy.title,
      category,
      size,
      palette: PALETTES[palette],
      heading: FONTS[layout][0],
      body: FONTS[layout][1],
      items: LAYOUTS[layout](copy, h),
    };
  }),
);

/* ---------------------------------------------------------------- applying */

/**
 * Turn a template into a design. With a brand kit, its colours replace the template's primary
 * and accent colours and its fonts replace the template's fonts.
 */
export function templateState(t: Template, brand?: BrandKit | null, media: "photo" | "video" = "photo"): PostState {
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
  for (const it of t.items) {
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
    size: t.size,
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
