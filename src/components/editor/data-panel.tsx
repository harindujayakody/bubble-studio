"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorField } from "./controls";
import { Segmented } from "./watermark-panel";
import { parseRows, parseTable, qrModules, qrTarget, rowsToText, tableToText, type ChartType } from "@/lib/editor/data-layers";
import type { Sticker } from "@/lib/editor/types";

type QrKind = "link" | "phone" | "whatsapp" | "text";
const QR_KINDS: { id: QrKind; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "phone", label: "Phone" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "text", label: "Text" },
];

/** What a stored QR target was made from, so it can be edited again. */
function qrSource(target: string): { kind: QrKind; value: string } {
  if (target.startsWith("tel:")) return { kind: "phone", value: target.slice(4) };
  if (target.startsWith("https://wa.me/")) return { kind: "whatsapp", value: target.slice(14) };
  if (/^https?:\/\//i.test(target)) return { kind: "link", value: target.replace(/^https:\/\//i, "") };
  return { kind: "text", value: target };
}

/** Settings for chart, table and QR layers. Keyed by layer id, so the text boxes keep what's typed. */
export function DataLayerSettings({ sticker, patch }: { sticker: Sticker; patch: (p: Partial<Sticker>, key?: string) => void }) {
  const id = sticker.id;
  const [rows, setRows] = useState(() => rowsToText(sticker.chart?.rows ?? []));
  const [cells, setCells] = useState(() => tableToText(sticker.table ?? []));
  const [qr, setQr] = useState(() => qrSource(sticker.qr ?? ""));
  const ink = (
    <ColorField label="Text colour" value={sticker.stroke ?? "#16181d"} onChange={(c) => patch({ stroke: c }, `ink:${id}`)} />
  );

  if (sticker.kind === "chart") {
    const chart = sticker.chart ?? { type: "bar" as ChartType, rows: [] };
    return (
      <>
        <Segmented
          label="Chart type"
          value={chart.type}
          onChange={(type) => patch({ chart: { ...chart, type } })}
          options={[
            { id: "bar", label: "Bars" },
            { id: "line", label: "Line" },
            { id: "pie", label: "Pie" },
          ]}
        />
        <div className="grid gap-1.5">
          <label htmlFor={`rows-${id}`} className="text-[13px] text-ink-soft">
            One per line: label, number
          </label>
          <Textarea
            id={`rows-${id}`}
            rows={5}
            value={rows}
            onChange={(e) => {
              setRows(e.target.value);
              patch({ chart: { ...chart, rows: parseRows(e.target.value) } }, `rows:${id}`);
            }}
            className="font-mono text-[13px]"
          />
        </div>
        <ColorField label="Main colour" value={sticker.color} onChange={(c) => patch({ color: c }, `color:${id}`)} />
        {ink}
      </>
    );
  }

  if (sticker.kind === "table") {
    return (
      <>
        <div className="grid gap-1.5">
          <label htmlFor={`cells-${id}`} className="text-[13px] text-ink-soft">
            One row per line, cells split by | (the first row is the header)
          </label>
          <Textarea
            id={`cells-${id}`}
            rows={6}
            value={cells}
            onChange={(e) => {
              setCells(e.target.value);
              patch({ table: parseTable(e.target.value) }, `cells:${id}`);
            }}
            className="font-mono text-[13px]"
          />
        </div>
        <ColorField label="Header colour" value={sticker.color} onChange={(c) => patch({ color: c }, `color:${id}`)} />
        {ink}
      </>
    );
  }

  // QR code.
  const set = (next: { kind: QrKind; value: string }) => {
    setQr(next);
    patch({ qr: qrTarget(next.kind, next.value) }, `qr:${id}`);
  };
  const tooLong = !!sticker.qr && !qrModules(sticker.qr);
  return (
    <>
      <Segmented label="QR code opens" value={qr.kind} onChange={(kind) => set({ ...qr, kind })} options={QR_KINDS} />
      <Input
        value={qr.value}
        maxLength={300}
        aria-label="QR code content"
        placeholder={qr.kind === "link" ? "yourshop.lk/menu" : qr.kind === "text" ? "Any text" : "077 123 4567"}
        onChange={(e) => set({ ...qr, value: e.target.value })}
      />
      <p className={tooLong ? "text-xs text-destructive" : "text-xs text-pretty text-ink-soft"}>
        {tooLong
          ? "That's too long for a QR code. Shorten it."
          : qr.kind === "whatsapp"
            ? "Include the country code, e.g. 94 77 123 4567."
            : "Made on this computer. Scan it with your phone before you post."}
      </p>
      <ColorField label="Code colour" value={sticker.color} onChange={(c) => patch({ color: c }, `color:${id}`)} />
    </>
  );
}
