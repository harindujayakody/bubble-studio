import { expect, test } from "@playwright/test";
import { keptParts, playable, reelAt, reelLength, removePart, sourceAt, splitAt } from "../src/lib/editor/segments";
import type { VideoClip } from "../src/lib/editor/types";

const clip = (o: Partial<VideoClip> = {}): VideoClip => ({ id: "c", name: "c", duration: 20, trimStart: 2, trimEnd: 12, audio: true, volume: 100, ...o });

test("a clip without cuts plays its trim", () => {
  const c = clip();
  expect(keptParts(c)).toEqual([{ start: 2, end: 12 }]);
  expect(reelLength(c)).toBe(10);
  expect(sourceAt(c, 3)).toBe(5);
  expect(reelAt(c, 5)).toBe(3);
});

test("split, delete the middle, and play at double speed", () => {
  const split1 = splitAt(clip(), 5)!;
  const split2 = splitAt(clip({ parts: split1 }), 8)!;
  expect(split2).toEqual([{ start: 2, end: 5 }, { start: 5, end: 8 }, { start: 8, end: 12 }]);
  const parts = removePart(clip({ parts: split2 }), 1)!;
  const c = clip({ parts, speed: 2 });
  // 3 s + 4 s of source at 2x
  expect(reelLength(c)).toBe(3.5);
  expect(sourceAt(c, 1)).toBe(4);
  expect(sourceAt(c, 2)).toBe(9); // past the 1.5 s first part, into the second
  expect(reelAt(c, 6)).toBe(1.5); // inside the deleted gap: the start of the next part
  expect(playable(c, 3)).toBeNull();
  expect(playable(c, 6)).toBe(8);
  expect(playable(c, 12)).toBe("end");
});

test("edges: no split near a cut, keep the last part, follow the trim", () => {
  expect(splitAt(clip(), 2.1)).toBeNull();
  expect(removePart(clip(), 0)).toBeNull();
  // Trimming later clips the stored parts.
  expect(keptParts(clip({ parts: [{ start: 2, end: 5 }, { start: 8, end: 12 }], trimEnd: 10 }))).toEqual([
    { start: 2, end: 5 },
    { start: 8, end: 10 },
  ]);
});
