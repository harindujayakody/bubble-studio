/** Parse #rgb or #rrggbb into 0-255 channels. Anything else reads as black. */
function rgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance. */
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The midpoint of two colours, used to judge a gradient as a whole. */
export function mix(a: string, b: string) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${hex((r1 + r2) / 2)}${hex((g1 + g2) / 2)}${hex((b1 + b2) / 2)}`;
}

/** Whether dark or light type reads better on this background. */
export function inkFor(background: string): "dark" | "light" {
  return contrast(background, "#000000") >= contrast(background, "#ffffff") ? "dark" : "light";
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The outline colour that separates text from anything behind it: black or
 * white, whichever contrasts more with the letters. White and yellow get black;
 * black and navy get white; mid tones like red pick the stronger of the two.
 */
export function autoOutline(textColor: string) {
  return contrast(textColor, "#000000") >= contrast(textColor, "#ffffff") ? "#000000" : "#ffffff";
}
