import { expect, test } from "@playwright/test";
import { align, bounds, distribute, scaleAbout, snap, type Box } from "../src/lib/editor/arrange";

const a: Box = { id: "a", cx: 0.2, cy: 0.2, w: 0.1, h: 0.1 };
const b: Box = { id: "b", cx: 0.5, cy: 0.6, w: 0.2, h: 0.2 };
const c: Box = { id: "c", cx: 0.9, cy: 0.4, w: 0.1, h: 0.2 };

test("align to each other, or to the page for one layer", () => {
  expect(align([a, b, c], "left").map((m) => m.x)).toEqual([0.2, 0.25, 0.2].map((v) => expect.closeTo(v, 6)));
  expect(align([a, b, c], "bottom").map((m) => m.y)).toEqual([0.65, 0.6, 0.6].map((v) => expect.closeTo(v, 6)));
  expect(align([b], "center")).toEqual([{ id: "b", x: 0.5, y: 0.6 }]);
  expect(align([b], "right")[0].x).toBeCloseTo(0.9);
  expect(bounds([a, c])).toMatchObject({ l: expect.closeTo(0.15, 6), r: expect.closeTo(0.95, 6) });
});

test("distribute keeps the ends and evens the gaps", () => {
  const moves = distribute([c, a, b], "x");
  const byId = Object.fromEntries(moves.map((m) => [m.id, m.x]));
  expect(byId.a).toBeCloseTo(0.2);
  expect(byId.c).toBeCloseTo(0.9);
  // span 0.15..0.95 holds 0.4 of boxes, so gaps are 0.2: b goes from 0.45 to 0.65.
  expect(byId.b).toBeCloseTo(0.55);
});

test("snap to the page centre and to another layer's edge, with gaps", () => {
  const t = { x: 0.01, y: 0.01 };
  const centred = snap({ id: "m", cx: 0.505, cy: 0.3, w: 0.1, h: 0.1 }, [], t);
  expect(centred.dx).toBeCloseTo(-0.005);
  expect(centred.xs).toContain(0.5);

  // Left edge 0.006 away from b's right edge (0.6): snaps flush, gap to b measured on the left.
  const beside = snap({ id: "m", cx: 0.656, cy: 0.62, w: 0.1, h: 0.1 }, [b], t);
  expect(beside.dx).toBeCloseTo(-0.006);
  expect(beside.xs).toContain(0.6);
  expect(snap({ id: "m", cx: 0.75, cy: 0.62, w: 0.1, h: 0.1 }, [b], t).gaps).toEqual([{ axis: "x", from: 0.6, to: expect.closeTo(0.7, 6), at: expect.closeTo(0.62, 6) }]);

  // Too far from everything: no snap, no guides.
  expect(snap({ id: "m", cx: 0.33, cy: 0.83, w: 0.1, h: 0.1 }, [], t)).toMatchObject({ dx: 0, dy: 0, xs: [], ys: [] });
});

test("scale positions about a point", () => {
  expect(scaleAbout([a], 2, 0.5, 0.5)).toEqual([{ id: "a", x: expect.closeTo(-0.1, 6), y: expect.closeTo(-0.1, 6) }]);
});
