import { expect, test } from "@playwright/test";
import { buildSrt, parseSrt, spreadLines } from "../src/lib/editor/captions";
import type { VideoClip } from "../src/lib/editor/types";

test("parse an .srt with Windows line ends, tags and a broken block", () => {
  const srt = "1\r\n00:00:01,000 --> 00:00:02,500\r\nHello <i>there</i>\r\n\r\n2\r\n00:00:03,200 --> 00:00:05,000\r\nTwo\r\nlines\r\n\r\n3\r\nnot a time\r\nskip me\r\n";
  expect(parseSrt(srt)).toEqual([
    { start: 1, end: 2.5, text: "Hello there" },
    { start: 3.2, end: 5, text: "Two\nlines" },
  ]);
  expect(parseSrt("WEBVTT\n\n00:00:00.5 --> 00:00:01.25\nVTT works")).toEqual([{ start: 0.5, end: 1.25, text: "VTT works" }]);
});

test("spread lines over the kept parts of a reel", () => {
  const clip: VideoClip = { id: "c", name: "c", duration: 20, trimStart: 0, trimEnd: 10, audio: true, volume: 100, parts: [{ start: 0, end: 2 }, { start: 6, end: 10 }] };
  const cues = spreadLines("one line\n\nanother!", clip);
  expect(cues.map((c) => c.text)).toEqual(["one line", "another!"]);
  // 6 s of reel split evenly (same length lines): 0-3 s reel = source 0-2 then 6-7.
  expect(cues[0].start).toBe(0);
  expect(cues[0].end).toBeCloseTo(7, 2);
  expect(cues[1].start).toBeCloseTo(7, 2);
  expect(cues[1].end).toBeCloseTo(10, 2);
});

test("an .srt follows the reel's cuts and speed, and round-trips", () => {
  const clip: VideoClip = { id: "c", name: "c", duration: 20, trimStart: 0, trimEnd: 10, audio: true, volume: 100, parts: [{ start: 0, end: 2 }, { start: 6, end: 10 }], speed: 2 };
  const srt = buildSrt(
    [
      { start: 0.5, end: 1.5, text: "first" },
      { start: 3, end: 4, text: "in the cut" },
      { start: 7, end: 9, text: "last" },
    ],
    clip,
  );
  expect(srt).toBe("1\n00:00:00,250 --> 00:00:00,750\nfirst\n\n2\n00:00:01,500 --> 00:00:02,500\nlast\n");
  expect(parseSrt(srt).map((c) => c.text)).toEqual(["first", "last"]);
});
