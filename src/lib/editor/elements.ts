import type { CollageGrid, ShapeId, Sticker } from "./types";

/* ------------------------------------------------------------------ shapes */

export const SHAPES: { id: ShapeId; label: string; aspect?: number }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded square" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "triangle-down", label: "Upside-down triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "cross", label: "Cross" },
  { id: "plaque", label: "Plaque" },
  { id: "ticket", label: "Ticket" },
  { id: "parallelogram", label: "Parallelogram" },
  { id: "parallelogram-left", label: "Parallelogram, leaning left" },
  { id: "trapezoid", label: "Trapezoid" },
  { id: "trapezoid-down", label: "Upside-down trapezoid" },
  { id: "u-shape", label: "U shape" },
  { id: "arch", label: "Arch" },
  { id: "right-triangle", label: "Right triangle" },
  { id: "semicircle", label: "Semicircle", aspect: 2 },
  { id: "quarter", label: "Quarter circle" },
  { id: "quarter-ring", label: "Quarter ring" },
  { id: "half-ring", label: "Half ring", aspect: 2 },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "hexagon", label: "Hexagon" },
  { id: "arrow", label: "Arrow", aspect: 1.6 },
  { id: "burst", label: "Sale burst" },
  { id: "bubble", label: "Speech bubble", aspect: 1.25 },
  { id: "line", label: "Line", aspect: 26 },
];

/** Shapes that use the corner-radius control. */
export const ROUNDABLE: ShapeId[] = ["square", "rounded", "bubble"];

function polygon(points: [number, number][]) {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

function starPoints(n: number, outer: number, inner: number, w: number, h: number): [number, number][] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / n - Math.PI / 2;
    return [Math.cos(a) * r * w, Math.sin(a) * r * h];
  });
}

/** The outline of a shape centred on 0,0 with the given size, in canvas units. */
export function shapePath(shape: ShapeId, w: number, h: number, radius = 0): Path2D {
  const hw = w / 2;
  const hh = h / 2;
  const r = (Math.min(w, h) / 2) * (radius / 100);
  switch (shape) {
    case "square": {
      const p = new Path2D();
      p.roundRect(-hw, -hh, w, h, r);
      return p;
    }
    case "rounded": {
      const p = new Path2D();
      p.roundRect(-hw, -hh, w, h, Math.max(r, Math.min(w, h) * 0.06));
      return p;
    }
    case "triangle-down":
      return polygon([[-hw, -hh], [hw, -hh], [0, hh]]);
    case "right-triangle":
      return polygon([[-hw, -hh], [hw, hh], [-hw, hh]]);
    case "cross": {
      const tx = hw * 0.34;
      const ty = hh * 0.34;
      return polygon([
        [-tx, -hh], [tx, -hh], [tx, -ty], [hw, -ty], [hw, ty], [tx, ty],
        [tx, hh], [-tx, hh], [-tx, ty], [-hw, ty], [-hw, -ty], [-tx, -ty],
      ]);
    }
    case "plaque":
      return polygon([[-hw, -hh * 0.84], [0, -hh], [hw, -hh * 0.84], [hw, hh * 0.84], [0, hh], [-hw, hh * 0.84]]);
    case "ticket": {
      const c = Math.min(w, h) * 0.1;
      const p = new Path2D();
      p.moveTo(-hw + c, -hh);
      p.lineTo(hw - c, -hh);
      p.arc(hw, -hh, c, Math.PI, Math.PI / 2, true);
      p.lineTo(hw, hh - c);
      p.arc(hw, hh, c, -Math.PI / 2, -Math.PI, true);
      p.lineTo(-hw + c, hh);
      p.arc(-hw, hh, c, 0, -Math.PI / 2, true);
      p.lineTo(-hw, -hh + c);
      p.arc(-hw, -hh, c, Math.PI / 2, 0, true);
      p.closePath();
      return p;
    }
    case "parallelogram":
      return polygon([[-hw * 0.6, -hh], [hw, -hh], [hw * 0.6, hh], [-hw, hh]]);
    case "parallelogram-left":
      return polygon([[-hw, -hh], [hw * 0.6, -hh], [hw, hh], [-hw * 0.6, hh]]);
    case "trapezoid":
      return polygon([[-hw * 0.55, -hh], [hw * 0.55, -hh], [hw, hh], [-hw, hh]]);
    case "trapezoid-down":
      return polygon([[-hw, -hh], [hw, -hh], [hw * 0.55, hh], [-hw * 0.55, hh]]);
    case "u-shape": {
      const p = new Path2D();
      p.moveTo(-hw, -hh);
      p.lineTo(hw, -hh);
      p.lineTo(hw, 0);
      p.ellipse(0, 0, hw, hh, 0, 0, Math.PI);
      p.closePath();
      return p;
    }
    case "arch": {
      const p = new Path2D();
      p.moveTo(-hw, hh);
      p.lineTo(-hw, 0);
      p.ellipse(0, 0, hw, hh, 0, Math.PI, Math.PI * 2);
      p.lineTo(hw, hh);
      p.closePath();
      return p;
    }
    case "semicircle": {
      const p = new Path2D();
      p.moveTo(-hw, hh);
      p.ellipse(0, hh, hw, h, 0, Math.PI, Math.PI * 2);
      p.closePath();
      return p;
    }
    case "quarter": {
      const p = new Path2D();
      p.moveTo(-hw, hh);
      p.lineTo(-hw, -hh);
      p.ellipse(-hw, hh, w, h, 0, -Math.PI / 2, 0);
      p.closePath();
      return p;
    }
    case "quarter-ring": {
      const p = new Path2D();
      p.moveTo(-hw, hh);
      p.ellipse(hw, hh, w, h, 0, Math.PI, Math.PI * 1.5);
      p.lineTo(hw, hh - h * 0.48);
      p.ellipse(hw, hh, w * 0.48, h * 0.48, 0, Math.PI * 1.5, Math.PI, true);
      p.closePath();
      return p;
    }
    case "half-ring": {
      const p = new Path2D();
      p.moveTo(-hw, hh);
      p.ellipse(0, hh, hw, h, 0, Math.PI, Math.PI * 2);
      p.lineTo(hw * 0.42, hh);
      p.ellipse(0, hh, hw * 0.42, h * 0.42, 0, Math.PI * 2, Math.PI, true);
      p.closePath();
      return p;
    }
    case "circle": {
      const p = new Path2D();
      p.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      return p;
    }
    case "triangle":
      return polygon([[0, -hh], [hw, hh], [-hw, hh]]);
    case "star":
      return polygon(starPoints(5, 0.5, 0.21, w, h).map(([x, y]) => [x, y + h * 0.04]));
    case "burst":
      return polygon(starPoints(14, 0.5, 0.4, w, h));
    case "hexagon":
      return polygon(Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return [Math.cos(a) * hw, Math.sin(a) * hh] as [number, number];
      }));
    case "diamond":
      return polygon([[0, -hh], [hw, 0], [0, hh], [-hw, 0]]);
    case "arrow":
      return polygon([
        [-hw, -hh * 0.36], [hw * 0.18, -hh * 0.36], [hw * 0.18, -hh], [hw, 0],
        [hw * 0.18, hh], [hw * 0.18, hh * 0.36], [-hw, hh * 0.36],
      ]);
    case "heart": {
      const p = new Path2D();
      p.moveTo(0, hh);
      p.bezierCurveTo(-hw * 1.1, hh * 0.15, -hw * 0.95, -hh * 1.05, 0, -hh * 0.45);
      p.bezierCurveTo(hw * 0.95, -hh * 1.05, hw * 1.1, hh * 0.15, 0, hh);
      p.closePath();
      return p;
    }
    case "bubble": {
      const bh = h * 0.78;
      const p = new Path2D();
      p.roundRect(-hw, -hh, w, bh, Math.max(r, Math.min(w, bh) * 0.08));
      p.moveTo(-hw * 0.45, -hh + bh - 1);
      p.lineTo(-hw * 0.62, hh);
      p.lineTo(-hw * 0.1, -hh + bh - 1);
      p.closePath();
      return p;
    }
    case "line": {
      const p = new Path2D();
      p.rect(-hw, -hh, w, h);
      return p;
    }
  }
}

export function drawShape(ctx: CanvasRenderingContext2D, s: Sticker, w: number, h: number, scale: number) {
  const shape = s.shape ?? "square";
  const path = shapePath(shape, w, h, s.radius ?? 0);
  const fill = s.fill ?? s.color;
  if (fill !== "none") {
    ctx.fillStyle = fill;
    ctx.fill(path, "nonzero");
  }
  const sw = (s.strokeWidth ?? 0) * scale;
  if (sw > 0 && s.stroke && s.stroke !== "none") {
    ctx.save();
    // Keep the border inside the shape so its size doesn't change.
    ctx.clip(path);
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = sw * 2;
    ctx.lineJoin = "round";
    ctx.stroke(path);
    ctx.restore();
  }
}

/* --------------------------------------------------------- animated stickers */

export const ANIMATED: { id: string; label: string; color: string }[] = [
  { id: "heart", label: "Beating heart", color: "#ff3d6e" },
  { id: "sparkle", label: "Sparkles", color: "#ffc93c" },
  { id: "arrow", label: "Bouncing arrow", color: "#7d2ae8" },
  { id: "star", label: "Spinning star", color: "#ffb800" },
  { id: "confetti", label: "Confetti", color: "#00c4cc" },
  { id: "new", label: "New badge", color: "#ff3d6e" },
  { id: "sale", label: "Sale burst", color: "#ff5a1f" },
  { id: "live", label: "Live dot", color: "#ff2d55" },
];

const TAU = Math.PI * 2;
const ease = (t: number) => 0.5 - Math.cos(t * TAU) / 2; // 0..1..0 over one period

/**
 * Draw an animated sticker centred on 0,0 at time t (seconds). At t = 0 each one rests in a
 * good-looking pose, which is what photo posts show.
 */
export function drawAnimated(ctx: CanvasRenderingContext2D, id: string, color: string, w: number, t: number) {
  const s = w / 100; // design on a 100-unit box
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (id) {
    case "heart": {
      const k = 1 + 0.12 * Math.max(0, Math.sin(t * TAU * 1.4)) ** 3;
      ctx.scale(k, k);
      ctx.fillStyle = color;
      ctx.fill(shapePath("heart", 84, 76));
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.ellipse(-20, -16, 9, 6, -0.6, 0, TAU);
      ctx.fill();
      break;
    }
    case "sparkle": {
      const stars = [
        [0, 0, 34, 0],
        [-30, -26, 14, 0.33],
        [30, 24, 18, 0.66],
      ];
      for (const [x, y, r, phase] of stars) {
        const k = 0.55 + 0.45 * ease(t * 0.9 + phase);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((t + phase) * 0.6);
        ctx.scale(k, k);
        ctx.fillStyle = color;
        ctx.fill(polygon(starPoints(4, r / 2 / 10, r / 2 / 10 * 0.28, 20, 20)));
        ctx.restore();
      }
      break;
    }
    case "arrow": {
      const y = -10 * ease(t * 1.2);
      ctx.translate(0, y);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color;
      ctx.fill(shapePath("arrow", 80, 64));
      break;
    }
    case "star": {
      ctx.rotate(t * 1.6);
      ctx.fillStyle = color;
      ctx.fill(shapePath("star", 92, 92));
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill(shapePath("star", 46, 46));
      break;
    }
    case "confetti": {
      const colors = [color, "#7d2ae8", "#ffc93c", "#ff3d6e", "#22c55e"];
      for (let i = 0; i < 18; i++) {
        const seed = Math.sin(i * 91.7) * 0.5 + 0.5;
        const x = (seed - 0.5) * 90;
        const fall = ((t * (0.35 + seed * 0.3) + i / 18) % 1) * 110 - 55;
        ctx.save();
        ctx.translate(x + Math.sin(t * 3 + i) * 6, fall);
        ctx.rotate(t * (2 + seed * 3) + i);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      break;
    }
    case "new":
    case "sale": {
      const wobble = id === "new" ? Math.sin(t * TAU * 0.8) * 0.12 : 0;
      const k = id === "sale" ? 1 + 0.06 * ease(t * 1.2) : 1;
      ctx.rotate(wobble - 0.12);
      ctx.scale(k, k);
      ctx.fillStyle = color;
      ctx.fill(shapePath("burst", 96, 96));
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${id === "new" ? 26 : 24}px Poppins, Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id === "new" ? "NEW" : "SALE", 0, 2);
      break;
    }
    case "live": {
      const p = (t * 0.9) % 1;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha *= 1 - p;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + p * 30, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------ collage grids */

/** Cell rectangles as [x, y, w, h] fractions of the post. */
export const GRID_LAYOUTS: { id: string; label: string; cells: [number, number, number, number][] }[] = [
  { id: "2v", label: "Two side by side", cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  { id: "2h", label: "Two stacked", cells: [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] },
  { id: "3l", label: "One big, two small", cells: [[0, 0, 0.6, 1], [0.6, 0, 0.4, 0.5], [0.6, 0.5, 0.4, 0.5]] },
  { id: "3t", label: "One on top, two below", cells: [[0, 0, 1, 0.6], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]] },
  { id: "3c", label: "Three columns", cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
  { id: "4", label: "Four squares", cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: "4l", label: "One big, three small", cells: [[0, 0, 0.66, 1], [0.66, 0, 0.34, 1 / 3], [0.66, 1 / 3, 0.34, 1 / 3], [0.66, 2 / 3, 0.34, 1 / 3]] },
  { id: "6", label: "Six squares", cells: [[0, 0, 1 / 3, 0.5], [1 / 3, 0, 1 / 3, 0.5], [2 / 3, 0, 1 / 3, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]] },
];

export const gridLayout = (id: string) => GRID_LAYOUTS.find((l) => l.id === id) ?? GRID_LAYOUTS[0];

/** Pixel rectangles of a grid's cells, with the gap around and between them. */
export function gridCells(grid: CollageGrid, width: number, height: number, scale: number) {
  const gap = grid.gap * scale;
  return gridLayout(grid.layout).cells.map(([x, y, w, h]) => {
    const left = x * width + (x === 0 ? gap : gap / 2);
    const top = y * height + (y === 0 ? gap : gap / 2);
    const right = (x + w) * width - (x + w >= 0.999 ? gap : gap / 2);
    const bottom = (y + h) * height - (y + h >= 0.999 ? gap : gap / 2);
    return { x: left, y: top, w: Math.max(1, right - left), h: Math.max(1, bottom - top) };
  });
}
