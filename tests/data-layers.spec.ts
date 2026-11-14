import { expect, test } from "@playwright/test";
import { parseRows, parseTable, qrModules, qrTarget, rowsToText, tableToText } from "../src/lib/editor/data-layers";

test("chart rows from typed lines", () => {
  expect(parseRows("Mon, 12\nTue: 18.5\n\nWed\t-3\nno number")).toEqual([
    { label: "Mon", value: 12 },
    { label: "Tue", value: 18.5 },
    { label: "Wed", value: -3 },
    { label: "no number", value: 0 },
  ]);
  const rows = [{ label: "A", value: 1 }];
  expect(parseRows(rowsToText(rows))).toEqual(rows);
});

test("table cells from | or pasted tabs", () => {
  expect(parseTable("Item | Price\nKottu | Rs 950\n")).toEqual([["Item", "Price"], ["Kottu", "Rs 950"]]);
  expect(parseTable("a\tb\nc\td")).toEqual([["a", "b"], ["c", "d"]]);
  expect(parseTable(tableToText([["x", "y"]]))).toEqual([["x", "y"]]);
});

test("QR targets and codes", () => {
  expect(qrTarget("link", "yourshop.lk/menu")).toBe("https://yourshop.lk/menu");
  expect(qrTarget("link", "mailto:a@b.lk")).toBe("mailto:a@b.lk");
  expect(qrTarget("phone", "077 123-4567")).toBe("tel:0771234567");
  expect(qrTarget("whatsapp", "+94 77 123 4567")).toBe("https://wa.me/94771234567");
  const m = qrModules("https://yourshop.lk")!;
  // Version 2 (25 modules) with the three finder squares in the corners.
  expect(m.length).toBe(25);
  for (const [r, c] of [[0, 0], [0, 24], [24, 0]]) expect(m[r][c]).toBe(true);
  expect(qrModules("x".repeat(3000))).toBeNull();
});
