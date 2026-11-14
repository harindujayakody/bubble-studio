import type { PostState } from "./types";

/**
 * Carousels: a photo design can have several pages (swipeable Facebook and Instagram posts).
 * The design itself is the page being edited; `pages` holds every page's own content, with the
 * current page's slot refreshed whenever pages are read or switched. Size, media and music are
 * shared. Keeping pages inside the state means undo, drafts and design files carry them as is.
 */
export const PAGE_KEYS = [
  "photoId",
  "photoName",
  "photoOriginal",
  "filter",
  "filterStrength",
  "adjust",
  "orientation",
  "crop",
  "background",
  "regions",
  "stickers",
  "texts",
  "grid",
] as const;
export type PageContent = Pick<PostState, (typeof PAGE_KEYS)[number]>;

export const MAX_PAGES = 10;

export function pageContent(s: PostState): PageContent {
  return Object.fromEntries(PAGE_KEYS.map((k) => [k, s[k]])) as PageContent;
}

/** Every page, with the one being edited up to date. */
export function allPages(s: PostState): PageContent[] {
  const page = s.page ?? 0;
  const pages = s.pages?.length ? [...s.pages] : [pageContent(s)];
  pages[Math.min(page, pages.length - 1)] = pageContent(s);
  return pages;
}

export const pageCount = (s: PostState) => (s.pages?.length ? s.pages.length : 1);

/** Each page as a full design, for previews and exports. */
export function pageStates(s: PostState): PostState[] {
  return allPages(s).map((p) => ({ ...s, ...p, pages: undefined, page: undefined }));
}

export function goToPage(s: PostState, i: number): PostState {
  const pages = allPages(s);
  const page = Math.max(0, Math.min(pages.length - 1, i));
  return { ...s, ...pages[page], pages, page };
}

/** A new page after the current one: a copy of it (new layer ids), or empty with the same background. */
export function addPage(s: PostState, copy: boolean): PostState {
  const pages = allPages(s);
  if (pages.length >= MAX_PAGES) return s;
  const now = pages[s.page ?? 0];
  const fresh = (id: string) => (copy ? crypto.randomUUID() : id);
  const next: PageContent = copy
    ? {
        ...structuredClone(now),
        texts: now.texts.map((t) => ({ ...structuredClone(t), id: fresh(t.id) })),
        stickers: now.stickers.map((t) => ({ ...structuredClone(t), id: fresh(t.id) })),
        regions: now.regions.map((r) => ({ ...r, id: fresh(r.id) })),
      }
    : {
        ...pageContent({ ...s, photoId: null, photoName: null, photoOriginal: null, crop: null, regions: [], stickers: [], texts: [], grid: null }),
        background: now.background,
      };
  const at = (s.page ?? 0) + 1;
  return goToPage({ ...s, pages: [...pages.slice(0, at), next, ...pages.slice(at)], page: s.page ?? 0 }, at);
}

export function deletePage(s: PostState, i: number): PostState {
  const pages = allPages(s);
  if (pages.length <= 1) return s;
  const rest = pages.filter((_, j) => j !== i);
  const page = Math.min(rest.length - 1, i <= (s.page ?? 0) ? Math.max(0, (s.page ?? 0) - 1) : (s.page ?? 0));
  // Back to one page: drop the list so the design is a plain post again.
  if (rest.length === 1) return { ...s, ...rest[0], pages: undefined, page: undefined };
  return { ...s, ...rest[page], pages: rest, page };
}

export function movePage(s: PostState, i: number, to: number): PostState {
  const pages = allPages(s);
  if (to < 0 || to >= pages.length || i === to) return s;
  const [p] = pages.splice(i, 1);
  pages.splice(to, 0, p);
  const current = s.page ?? 0;
  const page = current === i ? to : current >= Math.min(i, to) && current <= Math.max(i, to) ? current + (i < to ? -1 : 1) : current;
  return { ...s, ...pages[page], pages, page };
}
