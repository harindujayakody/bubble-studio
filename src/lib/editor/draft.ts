"use client";

import { useSyncExternalStore } from "react";
import type { PostState } from "./types";

/*
 * Recent designs, kept only in this browser (like Canva's "Continue designing"). Each design
 * (a small JSON object) and the files it uses (uploaded photos, videos, music, images) go into
 * IndexedDB, which can hold large media unlike localStorage. Only the newest MAX_RECENT designs
 * are kept. Library stickers and music are not copied; they reload from their URLs.
 */

const DB_NAME = "bubble-studio";
const DB_VERSION = 1;
const DRAFTS = "drafts";
const FILES = "files";
const PREF = "bubble-studio:autosave";
const PREF_EVENT = "bubble-studio:autosave";
export const MAX_RECENT = 5;

export type DraftAsset = { id: string; kind: "image" | "video" | "audio"; name?: string };
export type Draft = {
  /** Missing on drafts saved before 1.1 (stored under the key "last"). */
  id?: string;
  name?: string;
  state: PostState;
  savedAt: number;
  thumb: string | null;
  assets: DraftAsset[];
};
export type DraftSummary = {
  id: string;
  name: string;
  savedAt: number;
  thumb: string | null;
  media: PostState["media"];
  size: PostState["size"];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS);
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function allDrafts(db: IDBDatabase): Promise<(Draft & { id: string })[]> {
  const store = db.transaction(DRAFTS).objectStore(DRAFTS);
  const [keys, values] = await Promise.all([
    request(store.getAllKeys()) as Promise<string[]>,
    request(store.getAll()) as Promise<Draft[]>,
  ]);
  return values.map((d, i) => ({ ...d, id: keys[i] })).sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Save a design and any files it needs that aren't stored yet. Designs beyond the newest
 * MAX_RECENT are dropped, and files no design uses any more are removed.
 */
export async function saveDraft(draft: Draft & { id: string }, files: Map<string, Blob>) {
  const db = await openDb();
  try {
    const others = (await allDrafts(db)).filter((d) => d.id !== draft.id);
    const kept = [draft, ...others].slice(0, MAX_RECENT);
    const dropped = others.slice(MAX_RECENT - 1);
    const keep = new Set(kept.flatMap((d) => d.assets.map((a) => a.id)));
    const stored = (await request(db.transaction(FILES).objectStore(FILES).getAllKeys())) as string[];
    const tx = db.transaction([DRAFTS, FILES], "readwrite");
    const drafts = tx.objectStore(DRAFTS);
    drafts.put(draft, draft.id);
    for (const d of dropped) drafts.delete(d.id);
    const fileStore = tx.objectStore(FILES);
    const have = new Set(stored);
    for (const a of draft.assets) {
      const blob = files.get(a.id);
      if (blob && !have.has(a.id)) fileStore.put(blob, a.id);
    }
    for (const id of stored) if (!keep.has(id)) fileStore.delete(id);
    await done(tx);
  } finally {
    db.close();
  }
}

/** The saved designs, newest first. */
export async function listDrafts(): Promise<DraftSummary[]> {
  try {
    const db = await openDb();
    try {
      return (await allDrafts(db)).map((d) => ({
        id: d.id,
        name: d.name ?? (d.state.media === "video" ? "Untitled reel" : "Untitled post"),
        savedAt: d.savedAt,
        thumb: d.thumb,
        media: d.state.media,
        size: d.state.size,
      }));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

export async function loadDraft(id: string): Promise<{ draft: Draft & { id: string }; files: Map<string, Blob> } | null> {
  const db = await openDb();
  try {
    const tx = db.transaction([DRAFTS, FILES]);
    const draft = (await request(tx.objectStore(DRAFTS).get(id))) as Draft | undefined;
    if (!draft) return null;
    const files = new Map<string, Blob>();
    for (const a of draft.assets) {
      const blob = (await request(tx.objectStore(FILES).get(a.id))) as Blob | undefined;
      if (blob) files.set(a.id, blob);
    }
    return { draft: { ...draft, id }, files };
  } finally {
    db.close();
  }
}

/** Remove one saved design (and files only it used), or every design when no id is given. */
export async function deleteDraft(id?: string) {
  try {
    const db = await openDb();
    try {
      if (!id) {
        const tx = db.transaction([DRAFTS, FILES], "readwrite");
        tx.objectStore(DRAFTS).clear();
        tx.objectStore(FILES).clear();
        await done(tx);
        return;
      }
      const rest = (await allDrafts(db)).filter((d) => d.id !== id);
      const keep = new Set(rest.flatMap((d) => d.assets.map((a) => a.id)));
      const stored = (await request(db.transaction(FILES).objectStore(FILES).getAllKeys())) as string[];
      const tx = db.transaction([DRAFTS, FILES], "readwrite");
      tx.objectStore(DRAFTS).delete(id);
      for (const f of stored) if (!keep.has(f)) tx.objectStore(FILES).delete(f);
      await done(tx);
    } finally {
      db.close();
    }
  } catch {
    // Nothing saved, or storage unavailable.
  }
}

/* The on/off preference is tiny, so it lives in localStorage. */

function readPref() {
  try {
    return window.localStorage.getItem(PREF) !== "off";
  } catch {
    return false;
  }
}

function subscribePref(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === PREF && cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(PREF_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PREF_EVENT, cb);
  };
}

export function useAutosave(): boolean {
  return useSyncExternalStore(subscribePref, readPref, () => true);
}

export function setAutosave(on: boolean) {
  try {
    window.localStorage.setItem(PREF, on ? "on" : "off");
  } catch {
    // Blocked storage: the switch simply won't stick.
  }
  window.dispatchEvent(new Event(PREF_EVENT));
}
