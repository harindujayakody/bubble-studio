import { expect, test } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { packDesign, unpackDesign } from "../src/lib/editor/design-file";
import { DEFAULT_STATE } from "../src/lib/editor/types";

test("a design and its media survive a round trip", async () => {
  const state = { ...DEFAULT_STATE, media: "photo" as const, photoId: "p1", texts: [], stickers: [] };
  const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" });
  const file = await packDesign(
    { name: "Sale", state, savedAt: 1, thumb: null, assets: [{ id: "p1", kind: "image" }, { id: "missing", kind: "video" }] },
    new Map([["p1", photo]]),
  );
  const { draft, files } = await unpackDesign(file);
  expect(draft.name).toBe("Sale");
  expect(draft.state.photoId).toBe("p1");
  expect([...files.keys()]).toEqual(["p1"]);
  expect(files.get("p1")!.type).toBe("image/jpeg");
  expect([...new Uint8Array(await files.get("p1")!.arrayBuffer())]).toEqual([1, 2, 3, 4]);
});

test("other files are refused with a plain message", async () => {
  await expect(unpackDesign(new Blob(["not a zip"]))).rejects.toThrow("This isn't a Bubble Studio design file.");
  const otherZip = new Blob([zipSync({ "design.json": strToU8(JSON.stringify({ format: "something-else" })) }) as BlobPart]);
  await expect(unpackDesign(otherZip)).rejects.toThrow("This isn't a Bubble Studio design file.");
  const newer = new Blob([zipSync({ "design.json": strToU8(JSON.stringify({ format: "bubble-studio-design", version: 99 })) }) as BlobPart]);
  await expect(unpackDesign(newer)).rejects.toThrow(/newer Bubble Studio/);
  const broken = new Blob([zipSync({ "design.json": strToU8(JSON.stringify({ format: "bubble-studio-design", version: 1, state: { media: "photo" } })) }) as BlobPart]);
  await expect(unpackDesign(broken)).rejects.toThrow("This isn't a Bubble Studio design file.");
});
