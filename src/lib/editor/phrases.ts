"use client";

import { useSyncExternalStore } from "react";

/**
 * Saved text phrases, kept in this browser's localStorage only. Nothing is
 * uploaded; clearing site data clears them.
 */
const KEY = "bubble-studio:phrases";
const MAX_LENGTH = 200;
const EVENT = "bubble-studio:phrases";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage can be full or blocked (private mode); the list just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function parse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, cb);
  };
}

/** The saved phrases, live across tabs. Empty during server rendering. */
export function useSavedPhrases(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  return parse(raw);
}

/** Split pasted or imported text into phrases: one per line, trimmed, de-duplicated. */
export function splitPhrases(text: string): string[] {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.slice(0, MAX_LENGTH));
}

/** Add phrases, skipping ones already saved. Returns how many were new. */
export function addPhrases(incoming: string[]): number {
  const current = parse(read());
  const seen = new Set(current);
  const fresh = incoming.filter((p) => !seen.has(p) && (seen.add(p), true));
  if (fresh.length) write([...current, ...fresh]);
  return fresh.length;
}

export function removePhrase(phrase: string) {
  write(parse(read()).filter((p) => p !== phrase));
}

export function clearPhrases() {
  write([]);
}
