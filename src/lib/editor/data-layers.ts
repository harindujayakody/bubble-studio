import qrcode from "qrcode-generator";
import type { Sticker } from "./types";

/**
 * Layers drawn from data: charts (bar, pie, line) from typed numbers, a small table, and a QR
 * code made on the device. They're stickers with their data on them, so they move, resize, stack,
 * save and export like any other layer. `color` is the main colour, `stroke` the text colour.
 */
export type ChartType = "bar" | "pie" | "line";
export type ChartData = { type: ChartType; rows: { label: string; value: number }[] };

const FONT = 'Poppins, "Noto Sans Sinhala", sans-serif';

/** A palette from the main colour: it, then rotations of its hue. */
function palette(base: string, n: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(base.trim());
  const rgb = m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255) : [0.49, 0.16, 0.91];
  const max = Math.max(...rgb), min = Math.min(...rgb);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0.6 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === rgb[0] ? ((rgb[1] - rgb[2]) / d) % 6 : max === rgb[1] ? (rgb[2] - rgb[0]) / d + 2 : (rgb[0] - rgb[1]) / d + 4;
  return Array.from({ length: n }, (_, i) => `hsl(${(h * 60 + i * (360 / Math.max(n, 5))) % 360} ${Math.round(s * 100)}% ${Math.round(Math.min(0.62, Math.max(0.42, l)) * 100)}%)`);
}

/** Rows from text like "Mon, 12" per line (comma, colon or tab between label and number). */
export function parseRows(text: string): ChartData["rows"] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(.*?)[,:\t]\s*(-?[\d.]+)\s*$/.exec(line);
      return m ? { label: m[1].trim(), value: Number(m[2]) } : { label: line, value: 0 };
    })
    .filter((r) => Number.isFinite(r.value))
    .slice(0, 12);
}

export const rowsToText = (rows: ChartData["rows"]) => rows.map((r) => `${r.label}, ${r.value}`).join("\n");

/** Table cells from text: one row per line, cells split by "|" (or tabs, as pasted from a sheet). */
export function parseTable(text: string): string[][] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.split(l.includes("|") ? "|" : "\t").map((c) => c.trim()))
    .slice(0, 12);
}

export const tableToText = (rows: string[][]) => rows.map((r) => r.join(" | ")).join("\n");

const fit = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
};

export function drawChart(ctx: CanvasRenderingContext2D, data: ChartData, color: string, ink: string, w: number, h: number) {
  const rows = data.rows.length ? data.rows : [{ label: "", value: 1 }];
  const colors = palette(color, rows.length);
  const font = Math.max(8, Math.min(w, h) * 0.055);
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.font = `500 ${font}px ${FONT}`;
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";

  if (data.type === "pie") {
    const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;
    const legendW = w * 0.38;
    const r = Math.min(w - legendW, h) * 0.44;
    const cx = (w - legendW) / 2;
    const cy = h / 2;
    let a = -Math.PI / 2;
    rows.forEach((row, i) => {
      const sweep = (Math.max(0, row.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a, a + sweep);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      a += sweep;
    });
    // Legend: swatch, label and share.
    const line = Math.min(font * 1.8, h / rows.length);
    const top = cy - (line * rows.length) / 2 + line / 2;
    rows.forEach((row, i) => {
      const y = top + i * line;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.roundRect(w - legendW, y - font * 0.4, font * 0.8, font * 0.8, font * 0.2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(fit(ctx, `${row.label} ${Math.round((Math.max(0, row.value) / total) * 100)}%`, legendW - font * 1.2), w - legendW + font * 1.2, y);
    });
  } else {
    const max = Math.max(...rows.map((r) => r.value), 0) || 1;
    const min = Math.min(...rows.map((r) => r.value), 0);
    const left = font * 0.4;
    const bottom = h - font * 1.8;
    const top = font * 1.6;
    const span = max - min || 1;
    const y = (v: number) => bottom - ((v - min) / span) * (bottom - top);
    const step = (w - left * 2) / rows.length;
    // Baseline.
    ctx.strokeStyle = ink;
    ctx.globalAlpha *= 0.25;
    ctx.lineWidth = Math.max(1, font * 0.06);
    ctx.beginPath();
    ctx.moveTo(left, y(0));
    ctx.lineTo(w - left, y(0));
    ctx.stroke();
    ctx.globalAlpha /= 0.25;
    ctx.textAlign = "center";
    if (data.type === "bar") {
      rows.forEach((row, i) => {
        const x = left + i * step + step * 0.15;
        const bw = step * 0.7;
        const y0 = y(Math.max(0, row.value));
        const y1 = y(Math.min(0, row.value));
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.roundRect(x, y0, bw, Math.max(1, y1 - y0), [Math.min(bw * 0.18, font * 0.4), Math.min(bw * 0.18, font * 0.4), 0, 0]);
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.fillText(fit(ctx, String(row.value), step), x + bw / 2, y0 - font * 0.7);
      });
    } else {
      const pts = rows.map((row, i) => [left + i * step + step / 2, y(row.value)] as const);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, font * 0.22);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      pts.forEach(([px, py], i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, font * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.fillText(fit(ctx, String(rows[i].value), step), px, py - font * 0.9);
      });
    }
    ctx.fillStyle = ink;
    rows.forEach((row, i) => ctx.fillText(fit(ctx, row.label, step * 0.95), left + i * step + step / 2, h - font * 0.8));
  }
  ctx.restore();
}

export function drawTable(ctx: CanvasRenderingContext2D, rows: string[][], color: string, ink: string, w: number, h: number) {
  const data = rows.length ? rows : [[""]];
  const cols = Math.max(...data.map((r) => r.length));
  const rh = h / data.length;
  const cw = w / cols;
  const font = Math.max(8, Math.min(rh * 0.42, cw * 0.22));
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.textBaseline = "middle";
  data.forEach((row, r) => {
    // Header row in the main colour; then light stripes.
    if (r === 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, rh, [rh * 0.2, rh * 0.2, 0, 0]);
      ctx.fill();
    } else if (r % 2 === 0) {
      ctx.fillStyle = "rgba(127,127,127,0.12)";
      ctx.fillRect(0, r * rh, w, rh);
    }
    for (let c = 0; c < cols; c++) {
      const text = row[c] ?? "";
      ctx.font = `${r === 0 ? 700 : 500} ${font}px ${FONT}`;
      ctx.fillStyle = r === 0 ? "#ffffff" : ink;
      ctx.textAlign = c === 0 ? "left" : "right";
      const x = c === 0 ? c * cw + font * 0.6 : (c + 1) * cw - font * 0.6;
      ctx.fillText(fit(ctx, text, cw - font * 1.2), x, r * rh + rh / 2);
    }
  });
  ctx.restore();
}

/** QR modules for the text, or null when it's too long to encode. */
export function qrModules(text: string): boolean[][] | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(text || " ", "Byte");
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
  } catch {
    return null;
  }
}

export function drawQr(ctx: CanvasRenderingContext2D, text: string, color: string, size: number) {
  const m = qrModules(text);
  ctx.save();
  // A white card with a quiet zone, so phones read it on any background.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.06);
  ctx.fill();
  if (m) {
    const quiet = 2;
    const cell = size / (m.length + quiet * 2);
    ctx.fillStyle = color;
    m.forEach((row, r) =>
      row.forEach((dark, c) => {
        if (dark) ctx.fillRect(-size / 2 + (c + quiet) * cell, -size / 2 + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }),
    );
  }
  ctx.restore();
}

/** A phone number or WhatsApp number as something a QR scanner opens. */
export function qrTarget(kind: "link" | "phone" | "whatsapp" | "text", value: string) {
  const v = value.trim();
  if (kind === "phone") return `tel:${v.replace(/[^\d+]/g, "")}`;
  if (kind === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
  if (kind === "link" && v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) return `https://${v}`;
  return v;
}

export type DataSticker = Pick<Sticker, "kind" | "chart" | "table" | "qr">;
