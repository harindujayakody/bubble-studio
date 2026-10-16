import type { PostState, Sticker, TextLayer } from "./types";

export type StackItem =
  | { kind: "text"; id: string; z: number; layer: TextLayer }
  | { kind: "sticker"; id: string; z: number; layer: Sticker };

/** Text and stickers in drawing order, bottom first. */
export function stackOrder(state: Pick<PostState, "texts" | "stickers">): StackItem[] {
  const items: StackItem[] = [
    ...state.stickers.map((layer) => ({ kind: "sticker" as const, id: layer.id, z: layer.z, layer })),
    ...state.texts.map((layer) => ({ kind: "text" as const, id: layer.id, z: layer.z, layer })),
  ];
  return items.sort((a, b) => a.z - b.z);
}

/** A z value above everything currently on the post. */
export function nextZ(state: Pick<PostState, "texts" | "stickers">): number {
  const order = stackOrder(state);
  return order.length ? order[order.length - 1].z + 1 : 1;
}

function withZ(state: PostState, z: Map<string, number>): PostState {
  return {
    ...state,
    texts: state.texts.map((t) => (z.has(t.id) ? { ...t, z: z.get(t.id)! } : t)),
    stickers: state.stickers.map((t) => (z.has(t.id) ? { ...t, z: z.get(t.id)! } : t)),
  };
}

/** Move a text or sticker one step up (1) or down (-1), or to the very top / bottom. */
export function restack(state: PostState, id: string, to: 1 | -1 | "top" | "bottom"): PostState {
  const order = stackOrder(state).map((i) => i.id);
  const from = order.indexOf(id);
  if (from < 0) return state;
  const target = to === "top" ? order.length - 1 : to === "bottom" ? 0 : from + to;
  if (target < 0 || target >= order.length || target === from) return state;
  order.splice(from, 1);
  order.splice(target, 0, id);
  return withZ(state, new Map(order.map((layerId, i) => [layerId, i + 1])));
}
