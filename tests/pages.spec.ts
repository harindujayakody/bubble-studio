import { expect, test } from "@playwright/test";
import { addPage, allPages, deletePage, goToPage, movePage, pageCount, pageStates } from "../src/lib/editor/pages";
import { DEFAULT_STATE, type PostState, type TextLayer } from "../src/lib/editor/types";

const text = (id: string, t: string) => ({ id, text: t }) as unknown as TextLayer;
const base: PostState = { ...DEFAULT_STATE, media: "photo", texts: [text("a", "One")], background: { kind: "solid", from: "#ff0000", to: "#ff0000" } };

test("add, switch and edit pages", () => {
  // A blank second page keeps the background.
  let s = addPage(base, false);
  expect(pageCount(s)).toBe(2);
  expect(s.page).toBe(1);
  expect(s.texts).toEqual([]);
  expect(s.background.from).toBe("#ff0000");
  // Edit page 2, go back to page 1: both kept.
  s = { ...s, texts: [text("b", "Two")] };
  s = goToPage(s, 0);
  expect(s.texts[0].text).toBe("One");
  expect(pageStates(s).map((p) => p.texts[0]?.text)).toEqual(["One", "Two"]);
  expect(pageStates(s)[0].pages).toBeUndefined();
});

test("a copied page gets new layer ids", () => {
  const s = addPage(base, true);
  expect(s.texts[0].text).toBe("One");
  expect(s.texts[0].id).not.toBe("a");
  expect(allPages(s)[0].texts[0].id).toBe("a");
});

test("move and delete pages", () => {
  let s = addPage(addPage(base, true), false); // pages: One, One(copy), blank; on page 2 (blank)
  s = { ...s, texts: [text("c", "Three")] };
  s = movePage(s, 2, 0); // Three, One, One(copy); still editing Three
  expect(s.page).toBe(0);
  expect(pageStates(s).map((p) => p.texts[0]?.text)).toEqual(["Three", "One", "One"]);
  s = deletePage(s, 0);
  expect(pageCount(s)).toBe(2);
  expect(s.texts[0].text).toBe("One");
  s = deletePage(s, 1);
  expect(s.pages).toBeUndefined(); // back to a plain post
  expect(pageCount(s)).toBe(1);
});
