"use client";

import { useSyncExternalStore } from "react";
import type { PostState } from "./types";

/*
 * Optional auto-save of the last post, kept only in this browser. The design
 * (a small JSON object) and the files it uses (uploaded photos, videos, music,
 * images) go into IndexedDB, which can hold large media unlike localStorage.
 * Library stickers and music are not copied; they reload from their URLs.
 */

const DB_NAME = "bubble-studio";
const DB_VERSION = 1;
const DRAFTS = "drafts";
const FILES = "files";
const KEY = "last";
const PREF = "bubble-studio:autosave";
const PREF_EVENT = "bubble-studio:autosave";

export type DraftAsset = { id: string; kind: "image" | "video" | "audio"; name?: string };
export type Draft = { state: PostState; savedAt: number; thumb: string | null; assets: DraftAsset[] };
export type DraftSummary = { savedAt: number; thumb: string | null; media: PostState["media"] };

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

/**
 * Save the draft and any files it needs that aren't stored yet; files no
 * longer referenced are removed so storage doesn't grow with every edit.
 */
export async function saveDraft(draft: Draft, files: Map<string, Blob>) {
  const db = await openDb();
  try {
    const keep = new Set(draft.assets.map((a) => a.id));
    const stored = new Set((await request(db.transaction(FILES).objectStore(FILES).getAllKeys())) as string[]);
    const tx = db.transaction([DRAFTS, FILES], "readwrite");
    tx.objectStore(DRAFTS).put(draft, KEY);
    const fileStore = tx.objectStore(FILES);
    for (const id of keep) {
      const blob = files.get(id);
      if (blob && !stored.has(id)) fileStore.put(blob, id);
    }
    for (const id of stored) if (!keep.has(id)) fileStore.delete(id);
    await done(tx);
  } finally {
    db.close();
  }
}

export async function peekDraft(): Promise<DraftSummary | null> {
  try {
    const db = await openDb();
    try {
      const d = (await request(db.transaction(DRAFTS).objectStore(DRAFTS).get(KEY))) as Draft | undefined;
      return d ? { savedAt: d.savedAt, thumb: d.thumb, media: d.state.media } : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function loadDraft(): Promise<{ draft: Draft; files: Map<string, Blob> } | null> {
  const db = await openDb();
  try {
    const tx = db.transaction([DRAFTS, FILES]);
    const draft = (await request(tx.objectStore(DRAFTS).get(KEY))) as Draft | undefined;
    if (!draft) return null;
    const files = new Map<string, Blob>();
    for (const a of draft.assets) {
      const blob = (await request(tx.objectStore(FILES).get(a.id))) as Blob | undefined;
      if (blob) files.set(a.id, blob);
    }
    return { draft, files };
  } finally {
    db.close();
  }
}

export async function deleteDraft() {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction([DRAFTS, FILES], "readwrite");
      tx.objectStore(DRAFTS).clear();
      tx.objectStore(FILES).clear();
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
    return window.localStorage.getItem(PREF) === "on";
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
  return useSyncExternalStore(subscribePref, readPref, () => false);
}

export function setAutosave(on: boolean) {
  try {
    window.localStorage.setItem(PREF, on ? "on" : "off");
  } catch {
    // Blocked storage: the switch simply won't stick.
  }
  window.dispatchEvent(new Event(PREF_EVENT));
}
