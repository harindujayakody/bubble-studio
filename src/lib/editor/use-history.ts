"use client";

import { useCallback, useState } from "react";

type History<T> = {
  past: T[];
  present: T;
  future: T[];
  lastKey: string | null;
  lastTime: number;
};

const LIMIT = 100;
const COALESCE_MS = 900;

/**
 * Undoable state. Calls that share a `key` within a short window collapse into
 * one history step, so dragging a slider or a text box is a single undo.
 */
export function useHistory<T>(initial: T) {
  const [h, setH] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
    lastKey: null,
    lastTime: 0,
  });

  const update = useCallback((updater: (s: T) => T, key?: string) => {
    setH((prev) => {
      const next = updater(prev.present);
      if (next === prev.present) return prev;
      const now = Date.now();
      if (key && key === prev.lastKey && now - prev.lastTime < COALESCE_MS) {
        return { ...prev, present: next, future: [], lastTime: now };
      }
      return {
        past: [...prev.past.slice(-LIMIT), prev.present],
        present: next,
        future: [],
        lastKey: key ?? null,
        lastTime: now,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setH((prev) => {
      if (prev.past.length === 0) return prev;
      return {
        past: prev.past.slice(0, -1),
        present: prev.past[prev.past.length - 1],
        future: [prev.present, ...prev.future],
        lastKey: null,
        lastTime: 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setH((prev) => {
      if (prev.future.length === 0) return prev;
      return {
        past: [...prev.past, prev.present],
        present: prev.future[0],
        future: prev.future.slice(1),
        lastKey: null,
        lastTime: 0,
      };
    });
  }, []);

  /** Replace the state and forget history, e.g. when a new post is started. */
  const reset = useCallback((next: T) => {
    setH({ past: [], present: next, future: [], lastKey: null, lastTime: 0 });
  }, []);

  return {
    state: h.present,
    reset,
    update,
    undo,
    redo,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
