"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

/**
 * Light / dark theme without a provider or extra dependency.
 *
 * The choice lives in localStorage and is applied as a `dark` class on <html>. A tiny inline
 * script in the root layout (THEME_SCRIPT in theme-script.ts) applies it before the first paint, so there is no
 * flash. Switching swaps CSS variables only, with transitions paused for that one frame, so
 * the whole app recolours at once instead of animating every element.
 */
export type ThemePref = "system" | "light" | "dark";

const listeners = new Set<() => void>();

const media = () => (typeof window === "undefined" ? null : window.matchMedia("(prefers-color-scheme: dark)"));

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return media()?.matches ? "dark" : "light";
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  const dark = resolveTheme(pref) === "dark";
  if (root.classList.contains("dark") === dark) return;
  // Pause transitions so hover fades etc. don't all animate to the new colours.
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
  current = pref;
  apply(pref);
  // The desktop app matches its window frame and startup colour.
  window.bubbleDesktop?.setTheme?.(pref);
  listeners.forEach((l) => l());
}

let current: ThemePref | null = null;
let watching = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    media()?.addEventListener("change", () => {
      if ((current ?? readPref()) === "system") {
        apply("system");
        listeners.forEach((l) => l());
      }
    });
  }
  return () => listeners.delete(listener);
}

const getPref = () => (current ??= readPref());

/** The stored choice ("system", "light" or "dark"). */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getPref, () => "system");
}

/** What is showing right now. */
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribe,
    () => resolveTheme(getPref()),
    () => "light",
  );
}
