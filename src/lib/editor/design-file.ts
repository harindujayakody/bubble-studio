import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { Draft } from "./draft";
import { DEFAULT_STATE } from "./types";

/**
 * Design files (.bubble): a ZIP with design.json (the design, like a saved draft) and media/<id>
 * for each photo, video or music file it uses. Library stickers, library music and sample photos
 * aren't copied; they load from the app, as they do for drafts.
 */
const FORMAT = "bubble-studio-design";
const VERSION = 1;

export const DESIGN_EXT = ".bubble";

export async function packDesign(draft: Draft, files: Map<string, Blob>): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {};
  const types: Record<string, string> = {};
  for (const a of draft.assets) {
    const blob = files.get(a.id);
    if (!blob || entries[`media/${a.id}`]) continue;
    entries[`media/${a.id}`] = new Uint8Array(await blob.arrayBuffer());
    types[a.id] = blob.type;
  }
  entries["design.json"] = strToU8(
    JSON.stringify({ format: FORMAT, version: VERSION, name: draft.name, savedAt: draft.savedAt, state: draft.state, assets: draft.assets, types }),
  );
  // Photos and videos are already compressed; storing is fast and barely bigger.
  return new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: "application/zip" });
}

/** Read a .bubble file. Throws an Error with a plain message when it isn't one we can open. */
export async function unpackDesign(file: Blob): Promise<{ draft: Draft & { id: string }; files: Map<string, Blob> }> {
  const notOurs = new Error("This isn't a Bubble Studio design file.");
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw notOurs;
  }
  let data: {
    format?: unknown;
    version?: unknown;
    name?: unknown;
    state?: Partial<Draft["state"]>;
    assets?: unknown;
    types?: Record<string, string>;
  };
  try {
    data = JSON.parse(strFromU8(zip["design.json"]));
  } catch {
    throw notOurs;
  }
  if (data?.format !== FORMAT) throw notOurs;
  if (typeof data.version !== "number" || data.version > VERSION) {
    throw new Error("This design was made with a newer Bubble Studio. Update the app to open it.");
  }
  const s = data.state;
  if (!s || (s.media !== "photo" && s.media !== "video") || !Array.isArray(s.texts) || !Array.isArray(s.stickers)) throw notOurs;

  const assets = (Array.isArray(data.assets) ? data.assets : []).filter(
    (a): a is Draft["assets"][number] => !!a && typeof a.id === "string" && ["image", "video", "audio"].includes(a.kind),
  );
  const files = new Map<string, Blob>();
  for (const a of assets) {
    const bytes = zip[`media/${a.id}`];
    if (bytes) files.set(a.id, new Blob([bytes as BlobPart], { type: data.types?.[a.id] ?? "" }));
  }
  return {
    draft: {
      id: crypto.randomUUID(),
      name: typeof data.name === "string" ? data.name : undefined,
      state: { ...DEFAULT_STATE, ...s, regions: Array.isArray(s.regions) ? s.regions : [] },
      savedAt: Date.now(),
      thumb: null,
      assets,
    },
    files,
  };
}
