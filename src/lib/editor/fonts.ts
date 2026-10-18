export type PosterFont = {
  family: string;
  label: string;
  weights: number[];
  /** Fallback stack used by the canvas while the web font loads. */
  fallback: string;
  script: "latin" | "sinhala";
};

/** Sinhala glyphs fall back here from any Latin-only face, so they never render as boxes. */
const SINHALA_FALLBACK = `"Noto Sans Sinhala", "Iskoola Pota"`;
export const SINHALA_RE = /[඀-෿]/;

export const POSTER_FONTS: PosterFont[] = [
  { family: "Anton", label: "Anton", weights: [400], fallback: "Impact, sans-serif", script: "latin" },
  { family: "Bebas Neue", label: "Bebas Neue", weights: [400], fallback: "Impact, sans-serif", script: "latin" },
  { family: "Montserrat", label: "Montserrat", weights: [500, 700, 900], fallback: "sans-serif", script: "latin" },
  { family: "Poppins", label: "Poppins", weights: [400, 600, 800], fallback: "sans-serif", script: "latin" },
  { family: "Oswald", label: "Oswald", weights: [500, 700], fallback: "sans-serif", script: "latin" },
  { family: "Archivo Black", label: "Archivo Black", weights: [400], fallback: "sans-serif", script: "latin" },
  { family: "Playfair Display", label: "Playfair Display", weights: [500, 700, 900], fallback: "serif", script: "latin" },
  { family: "DM Serif Display", label: "DM Serif Display", weights: [400], fallback: "serif", script: "latin" },
  { family: "Pacifico", label: "Pacifico", weights: [400], fallback: "cursive", script: "latin" },
  { family: "Lobster", label: "Lobster", weights: [400], fallback: "cursive", script: "latin" },
  { family: "Caveat", label: "Caveat", weights: [500, 700], fallback: "cursive", script: "latin" },
  { family: "Permanent Marker", label: "Permanent Marker", weights: [400], fallback: "cursive", script: "latin" },
  // Sinhala (සිංහල). All include Latin glyphs too.
  { family: "Noto Sans Sinhala", label: "Noto Sans Sinhala", weights: [300, 400, 600, 800, 900], fallback: "sans-serif", script: "sinhala" },
  { family: "Google Sans", label: "Google Sans", weights: [400, 500, 700], fallback: "sans-serif", script: "sinhala" },
  { family: "Maname", label: "Maname", weights: [400], fallback: "serif", script: "sinhala" },
  { family: "Noto Serif Sinhala", label: "Noto Serif Sinhala", weights: [400, 700], fallback: "serif", script: "sinhala" },
  { family: "Abhaya Libre", label: "Abhaya Libre", weights: [400, 600, 800], fallback: "serif", script: "sinhala" },
  { family: "Yaldevi", label: "Yaldevi", weights: [400, 600, 700], fallback: "sans-serif", script: "sinhala" },
  { family: "Gemunu Libre", label: "Gemunu Libre", weights: [400, 600, 800], fallback: "sans-serif", script: "sinhala" },
  { family: "Stick No Bills", label: "Stick No Bills", weights: [400, 700, 800], fallback: "sans-serif", script: "sinhala" },
];

export function getFont(family: string): PosterFont {
  return POSTER_FONTS.find((f) => f.family === family) ?? POSTER_FONTS[0];
}

/** Nearest weight the family actually ships, so the canvas never fakes bold. */
export function nearestWeight(family: string, weight: number): number {
  const { weights } = getFont(family);
  return weights.reduce((best, w) =>
    Math.abs(w - weight) < Math.abs(best - weight) ? w : best,
  );
}

/** CSS font-family list: the face, then a Sinhala fallback, then its generic. */
export function fontStack(family: string) {
  const f = getFont(family);
  return `"${f.family}", ${SINHALA_FALLBACK}, ${f.fallback}`;
}

export function fontString(family: string, weight: number, sizePx: number) {
  return `${nearestWeight(family, weight)} ${sizePx}px ${fontStack(family)}`;
}
