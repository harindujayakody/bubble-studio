/** Reference width that font and sticker sizes were designed against. */
export const POST_SIZE = 1080;

export type PostSizeId = "square" | "portrait" | "landscape" | "story";

export const POST_SIZES: Record<PostSizeId, { label: string; ratio: string; w: number; h: number; use: string }> = {
  square: { label: "Square post", ratio: "1:1", w: 1080, h: 1080, use: "Feed posts and ads" },
  portrait: { label: "Portrait post", ratio: "3:4", w: 1080, h: 1440, use: "Fills more of the feed on phones" },
  landscape: { label: "Landscape", ratio: "16:9", w: 1920, h: 1080, use: "Link shares, events and video covers" },
  story: { label: "Story or reel", ratio: "9:16", w: 1080, h: 1920, use: "Full-screen stories and reel covers" },
};

export type ToolId = "photo" | "filters" | "adjust" | "crop" | "text" | "elements" | "blur";

export type Adjustments = {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  warmth: number; // -100..100
  fade: number; // 0..100
  vignette: number; // 0..100
  blur: number; // 0..100
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  fade: 0,
  vignette: 0,
  blur: 0,
};

export type Orientation = {
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
};

/** Crop in pixels of the oriented source image. `size` is the width; the height follows the post's ratio. */
export type Crop = { x: number; y: number; size: number };

export type TextAlign = "left" | "center" | "right";

/** Colour fill behind text: one box around the block, or a band behind each line. */
export type TextFill = {
  mode: "none" | "box" | "lines";
  color: string;
  opacity: number; // 0..100
  radius: number; // 0..100, share of the maximum rounding
  padding: number; // 0..100
};

export const DEFAULT_FILL: TextFill = { mode: "none", color: "#7d2ae8", opacity: 100, radius: 30, padding: 40 };

/** A stroke around the letters. `color: "auto"` picks black or white for contrast with the text. */
export type TextOutline = { on: boolean; width: number; color: "auto" | string };

export const DEFAULT_OUTLINE: TextOutline = { on: false, width: 30, color: "auto" };

/** When a layer shows in a reel, in seconds of the source video. Unset means the whole clip. */
export type Timing = { start?: number; end?: number };

export type TextLayer = {
  id: string;
  text: string;
  /** Anchor position as a fraction of the post (0..1). */
  x: number;
  y: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number; // px at 1080
  color: string;
  align: TextAlign;
  uppercase: boolean;
  letterSpacing: number; // em/100
  lineHeight: number; // multiplier
  /** Wrap width as a fraction of the post. */
  width: number;
  shadow: boolean;
  fill: TextFill;
  outline?: TextOutline;
  rotation: number; // degrees
  /** Stacking order shared with stickers; higher draws on top. */
  z: number;
} & Timing;

export type StickerKind = "emoji" | "icon" | "image";

export type Sticker = {
  id: string;
  kind: StickerKind;
  /** Emoji character, icon name, or asset id for an image (uploaded or from the sticker set). */
  value: string;
  x: number; // centre, fraction of the post
  y: number;
  size: number; // width in px at 1080
  rotation: number;
  color: string; // icon stroke
  opacity: number; // 0..100
  /** Stacking order shared with text layers; higher draws on top. */
  z: number;
} & Timing;

/** An area of the photo to blur or pixelate, e.g. a face, number plate or price. */
export type Region = {
  id: string;
  kind: "blur" | "pixelate";
  shape: "rect" | "ellipse";
  /** Top-left corner and size, as fractions of the post. */
  x: number;
  y: number;
  w: number;
  h: number;
  strength: number; // 0..100
};

export type Background = {
  kind: "solid" | "gradient";
  from: string;
  to: string;
};

/** A video clip for reels. The element itself lives outside history, keyed by `id`. */
export type VideoClip = {
  id: string;
  name: string;
  duration: number; // seconds
  trimStart: number;
  trimEnd: number;
  /** Keep the clip's own sound in the export. */
  audio: boolean;
  /** Original sound level, 0..100. */
  volume: number;
};

/**
 * Background music for a reel. It always fits the reel: playback starts at
 * `offset` seconds into the track and is cut at the reel's end; a track shorter
 * than the reel loops when `loop` is on.
 */
export type MusicTrack = {
  /** Key for the loaded audio element (library tracks use their URL). */
  id: string;
  name: string;
  src: string;
  duration: number;
  offset: number;
  volume: number; // 0..100
  on: boolean;
  loop: boolean;
  /** Fade out over the last 1.5 seconds. */
  fade: boolean;
};

export type PostState = {
  /** A photo post or a video reel; chosen on the start screen. */
  media: "photo" | "video";
  size: PostSizeId;
  video: VideoClip | null;
  music: MusicTrack | null;
  /** Present when a photo is loaded. The pixels themselves live outside history. */
  photoId: string | null;
  photoName: string | null;
  filter: string;
  filterStrength: number; // 0..100
  adjust: Adjustments;
  orientation: Orientation;
  crop: Crop | null;
  background: Background;
  regions: Region[];
  stickers: Sticker[];
  texts: TextLayer[];
};

export const DEFAULT_STATE: PostState = {
  media: "photo",
  size: "square",
  video: null,
  music: null,
  photoId: null,
  photoName: null,
  filter: "original",
  filterStrength: 100,
  adjust: DEFAULT_ADJUSTMENTS,
  orientation: { rotation: 0, flipX: false, flipY: false },
  crop: null,
  background: { kind: "solid", from: "#f4efe6", to: "#d9c7ae" },
  regions: [],
  stickers: [],
  texts: [],
};

export const TEXT_STYLES = {
  headline: {
    label: "Headline",
    fontFamily: "Anton",
    fontWeight: 400,
    fontSize: 132,
    uppercase: true,
    letterSpacing: 1,
    lineHeight: 1.02,
    width: 0.84,
  },
  subheading: {
    label: "Subheading",
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontSize: 56,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.15,
    width: 0.8,
  },
  sinhala: {
    label: "සිංහල",
    fontFamily: "Noto Sans Sinhala",
    fontWeight: 800,
    fontSize: 96,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.25,
    width: 0.84,
  },
  body: {
    label: "Small text",
    fontFamily: "Poppins",
    fontWeight: 400,
    fontSize: 36,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.35,
    width: 0.7,
  },
} as const;

export type TextStyleId = keyof typeof TEXT_STYLES;
