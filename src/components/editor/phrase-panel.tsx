"use client";

import { useRef, useState } from "react";
import { ChevronDown, ClipboardPaste, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fontStack, SINHALA_RE } from "@/lib/editor/fonts";
import { addPhrases, clearPhrases, removePhrase, splitPhrases, useSavedPhrases } from "@/lib/editor/phrases";
import type { TextStyleId } from "@/lib/editor/types";

/**
 * Phrases the user imported in bulk (a .txt file with one per line, or a
 * pasted list). They live in this browser's localStorage only and stay
 * collapsed until opened.
 */
export function SavedPhrases({ onAdd }: { onAdd: (style: TextStyleId, text: string) => void }) {
  const phrases = useSavedPhrases();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const report = (added: number, total: number) => {
    if (total === 0) toast.error("No phrases found", { description: "Put one phrase on each line." });
    else if (added === 0) toast("Those phrases are already saved");
    else toast.success(`${added} phrase${added === 1 ? "" : "s"} saved`, { description: "Stored in this browser only." });
  };

  const importFile = async (file: File) => {
    try {
      const list = splitPhrases(await file.text());
      report(addPhrases(list), list.length);
      setOpen(true);
    } catch {
      toast.error("That file couldn't be read", { description: "Use a plain .txt file saved as UTF-8." });
    }
  };

  return (
    <section className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-aqua focus-visible:ring-inset"
      >
        <span className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Saved phrases</h3>
          {phrases.length > 0 && <span className="font-mono text-[11px] text-ink-soft tabular">{phrases.length}</span>}
        </span>
        <ChevronDown className={cn("size-4 text-ink-soft transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-5">
          {phrases.length === 0 ? (
            <p className="mb-3 text-[13px] text-pretty text-ink-soft">
              Import a list of phrases you use often, one per line. They&apos;re saved in this browser only, never uploaded.
            </p>
          ) : (
            <div className="mb-3 flex flex-wrap gap-1.5" lang="si">
              {phrases.map((phrase) => (
                <span key={phrase} className="relative">
                  <button
                    type="button"
                    onClick={() => onAdd(SINHALA_RE.test(phrase) ? "sinhala" : "subheading", phrase)}
                    disabled={editing}
                    className={cn(
                      "rounded-full border border-rule bg-sheet py-1.5 text-[13px] text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua",
                      editing ? "pr-7 pl-3" : "px-3 hover:border-brand/50 hover:bg-brand-wash",
                    )}
                    style={{ fontFamily: fontStack("Noto Sans Sinhala") }}
                  >
                    {phrase}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => removePhrase(phrase)}
                      aria-label={`Remove ${phrase}`}
                      className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-full text-ink-soft outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-aqua"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {pasting && (
            <div className="mb-3 grid gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                autoFocus
                placeholder={"One phrase per line"}
                className="resize-y bg-sheet text-[14px]"
                style={{ fontFamily: fontStack("Noto Sans Sinhala") }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-brand text-white hover:bg-brand-ink"
                  onClick={() => {
                    const list = splitPhrases(draft);
                    report(addPhrases(list), list.length);
                    if (list.length) {
                      setDraft("");
                      setPasting(false);
                    }
                  }}
                >
                  Save phrases
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPasting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp /> Import .txt
            </Button>
            {!pasting && (
              <Button variant="outline" size="sm" onClick={() => setPasting(true)}>
                <ClipboardPaste /> Paste list
              </Button>
            )}
            {phrases.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
                {editing ? "Done" : "Edit"}
              </Button>
            )}
            {editing && phrases.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Remove all ${phrases.length} saved phrases from this browser?`)) {
                    clearPhrases();
                    setEditing(false);
                  }
                }}
              >
                Clear all
              </Button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </section>
  );
}
