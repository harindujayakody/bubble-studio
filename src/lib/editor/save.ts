"use client";

import { useSyncExternalStore } from "react";

/**
 * Every export goes through saveExport(), so files can land in an organised master folder:
 *
 *   <chosen folder>/Reels, /Photos, /Audios, /Merged Videos
 *
 * Desktop app: the folder is chosen in Settings and the shell sorts each download into its
 * subfolder. Web (Chrome, Edge): the folder is picked with the File System Access API and
 * remembered in this browser. Anywhere else, files download as usual.
 */
export type ExportKind = "photos" | "reels" | "audios" | "merged";

export const EXPORT_FOLDERS: Record<ExportKind, string> = {
  reels: "Reels",
  photos: "Photos",
  audios: "Audios",
  merged: "Merged Videos",
};

/* ------------------------------------------------------- web folder handle */

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
};

const DB = "bubble-studio-export";
const STORE = "handles";

function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}

let folder: DirHandle | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function loadFolder() {
  if (loaded) return folder;
  loaded = true;
  try {
    folder = (await idb<DirHandle | undefined>("readonly", (s) => s.get("master"))) ?? null;
  } catch {
    folder = null;
  }
  emit();
  return folder;
}

/** The web browser can write into a folder the user picks (Chromium browsers). */
export function canPickFolder() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && !window.bubbleDesktop;
}

export async function chooseWebFolder() {
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
  const handle = await picker({ id: "bubble-studio-exports", mode: "readwrite", startIn: "downloads" });
  folder = handle;
  loaded = true;
  await idb("readwrite", (s) => s.put(handle, "master")).catch(() => {});
  emit();
}

export async function clearWebFolder() {
  folder = null;
  await idb("readwrite", (s) => s.delete("master")).catch(() => {});
  emit();
}

/** Name of the chosen web folder, or null. */
export function useWebFolder(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      void loadFolder();
      return () => listeners.delete(l);
    },
    () => folder?.name ?? null,
    () => null,
  );
}

async function writable(handle: DirHandle) {
  try {
    if ((await handle.queryPermission?.({ mode: "readwrite" })) === "granted") return true;
    return (await handle.requestPermission?.({ mode: "readwrite" })) === "granted";
  } catch {
    // requestPermission needs a fresh click; after a long export it may refuse.
    return false;
  }
}

/** "name.ext", or "name (2).ext" ... when taken. */
async function freeName(dir: FileSystemDirectoryHandle, filename: string) {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  for (let n = 1; n < 1000; n++) {
    const name = n === 1 ? filename : `${base} (${n})${ext}`;
    try {
      await dir.getFileHandle(name);
    } catch {
      return name;
    }
  }
  return `${base}-${Date.now()}${ext}`;
}

/* ------------------------------------------------------------------- save */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Save an export. Returns where it went ("Bubble/Photos/post.jpg") when written into the
 * web master folder, or null for a normal download (the desktop app reports its own save).
 */
export async function saveExport(blob: Blob, filename: string, kind: ExportKind): Promise<string | null> {
  const bridge = window.bubbleDesktop;
  if (bridge) {
    await bridge.setDownloadKind?.(kind);
    download(blob, filename);
    return null;
  }
  const dir = await loadFolder();
  if (dir && (await writable(dir))) {
    try {
      const sub = await dir.getDirectoryHandle(EXPORT_FOLDERS[kind], { create: true });
      const name = await freeName(sub, filename);
      const file = await sub.getFileHandle(name, { create: true });
      const stream = await file.createWritable();
      await stream.write(blob);
      await stream.close();
      return `${dir.name}/${EXPORT_FOLDERS[kind]}/${name}`;
    } catch {
      // Folder moved or deleted: fall back to a download.
    }
  }
  download(blob, filename);
  return null;
}
