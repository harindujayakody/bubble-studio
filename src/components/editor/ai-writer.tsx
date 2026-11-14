"use client";

import { useState } from "react";
import { Copy, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelSection, RangeField } from "./controls";
import { Segmented } from "./watermark-panel";
import { useIsDesktop } from "./desktop-updates";
import {
  MODELS,
  removeAIKey,
  saveAI,
  testAI,
  useAIStatus,
  writePost,
  type AILanguage,
  type AITarget,
  type Suggestion,
} from "@/lib/editor/ai";
import type { PostState, TextStyleId } from "@/lib/editor/types";

type Update = (fn: (s: PostState) => PostState, key?: string) => void;

const LANGUAGES: { id: AILanguage; label: string }[] = [
  { id: "English", label: "English" },
  { id: "Sinhala", label: "සිංහල" },
  { id: "Tamil", label: "தமிழ்" },
  { id: "Sinhala and English", label: "Mixed" },
];
const TONES = ["Friendly", "Professional", "Festive", "Funny", "Exciting", "Calm and elegant", "Sri Lankan English", "Formal Sinhala"];
const TARGETS: { id: AITarget; label: string; hint: string }[] = [
  { id: "headline", label: "Headline", hint: "Only the biggest text" },
  { id: "design", label: "Whole design", hint: "Headline, subheading and small text" },
  { id: "caption", label: "Caption", hint: "A Facebook caption with hashtags" },
];

/** Settings → AI writer: the user's own OpenRouter key and model. */
export function AISettingsSection() {
  const ai = useAIStatus();
  const desktop = useIsDesktop();
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await saveAI(key, model ?? ai.model);
      setKey("");
      await testAI();
      toast.success("AI writer is ready", { description: "Your key works." });
    } catch (e) {
      toast.error("The key didn't work", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection title="AI writer">
      <p className="-mt-1 text-[13px] text-pretty text-ink-soft">
        Write post text with AI using your own{" "}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
          OpenRouter key
        </a>
        . Only your prompt and the design&apos;s words are sent, straight to OpenRouter.
      </p>
      <div className="mt-3 grid gap-2">
        <Input
          type="password"
          autoComplete="off"
          value={key}
          placeholder={ai.hasKey ? "Key saved · paste a new one to replace it" : "sk-or-…"}
          aria-label="OpenRouter API key"
          onChange={(e) => setKey(e.target.value)}
        />
        <Input
          list="ai-models"
          value={model ?? ai.model}
          aria-label="Model"
          placeholder="Model, e.g. google/gemini-2.5-flash"
          onChange={(e) => setModel(e.target.value)}
        />
        <datalist id="ai-models">
          {MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy || (!key.trim() && !ai.hasKey)} onClick={() => void save()}>
            {busy && <LoaderCircle className="animate-spin" />}
            {key.trim() || !ai.hasKey ? "Save and test" : "Test"}
          </Button>
          {ai.hasKey && (
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void removeAIKey().then(() => toast.success("Key removed"))}>
              Remove key
            </Button>
          )}
        </div>
        <p className="text-xs text-pretty text-ink-soft">
          {desktop
            ? "The key is encrypted on this computer and only used to talk to OpenRouter."
            : "The key is kept in this browser only. Anyone using this browser profile could read it."}
        </p>
      </div>
    </PanelSection>
  );
}

/** Text → Write with AI: three suggestions that fill the design's text layers or copy a caption. */
export function AIWriterSection({ state, update, onAdd }: { state: PostState; update: Update; onAdd: (style: TextStyleId, text?: string) => void }) {
  const ai = useAIStatus();
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<AILanguage>("English");
  const [tone, setTone] = useState(TONES[0]);
  const [words, setWords] = useState(10);
  const [target, setTarget] = useState<AITarget>("design");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);

  if (!ai.hasKey) {
    return (
      <PanelSection title="Write with AI">
        <p className="-mt-1 text-[13px] text-pretty text-ink-soft">
          Describe your post and get ready-to-use text in English, Sinhala or Tamil. Add your OpenRouter key in <b className="font-medium text-ink">Settings → AI writer</b> to turn it on.
        </p>
      </PanelSection>
    );
  }

  const generate = async () => {
    setBusy(true);
    try {
      setResults(await writePost({ prompt, language, tone, words, target, current: state.texts.map((t) => t.text) }));
    } catch (e) {
      toast.error("Couldn't write text", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Biggest text is the headline, then the subheading, then small text; styling is kept.
  const apply = (s: Suggestion) => {
    const lines = (target === "headline" ? [s.headline] : [s.headline, s.subheading, s.body]).filter(Boolean);
    const byRole = [...state.texts].sort((a, b) => b.fontSize - a.fontSize).map((t) => t.id);
    update((st) => ({
      ...st,
      texts: st.texts.map((t) => {
        const i = byRole.indexOf(t.id);
        return i >= 0 && i < lines.length ? { ...t, text: lines[i] } : t;
      }),
    }));
    const sinhala = language !== "English" && language !== "Tamil";
    const styles: TextStyleId[] = [sinhala ? "sinhala" : "headline", sinhala ? "sinhala" : "subheading", "body"];
    lines.slice(byRole.length).forEach((line, j) => onAdd(styles[byRole.length + j], line));
  };

  const copy = (s: Suggestion) =>
    void navigator.clipboard
      .writeText([s.caption, s.hashtags.join(" ")].filter(Boolean).join("\n\n"))
      .then(() => toast.success("Caption copied"), () => toast.error("Couldn't copy the caption"));

  return (
    <PanelSection title="Write with AI">
      <div className="grid gap-3">
        <Textarea
          value={prompt}
          maxLength={500}
          rows={3}
          placeholder="e.g. Grand opening of my bakery on Saturday, 20% off all cakes"
          aria-label="Describe your post"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Segmented label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
        <Select value={tone} onValueChange={(v) => v && setTone(v as string)}>
          <SelectTrigger className="w-full bg-sheet" aria-label="Tone">
            <SelectValue>{(v: string) => `Tone: ${v}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TONES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Segmented label="What to write" value={target} onChange={setTarget} options={TARGETS} />
        <RangeField label="Word limit" value={words} min={3} max={30} defaultValue={10} format={(v) => `${v} words`} onChange={setWords} />
        <Button disabled={busy || !prompt.trim()} onClick={() => void generate()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {busy ? "Writing…" : results.length ? "Write again" : "Write"}
        </Button>

        {results.length > 0 && (
          <ul className="grid gap-2" aria-label="Suggestions">
            {results.map((s, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-rule bg-sheet p-3">
                {target === "caption" ? (
                  <p className="text-[13px] whitespace-pre-line text-ink">
                    {s.caption}
                    {s.hashtags.length > 0 && <span className="mt-1 block text-brand">{s.hashtags.join(" ")}</span>}
                  </p>
                ) : (
                  <div className="grid gap-0.5">
                    <p className="text-[15px] font-semibold text-ink">{s.headline}</p>
                    {target === "design" && s.subheading && <p className="text-[13px] text-ink">{s.subheading}</p>}
                    {target === "design" && s.body && <p className="text-xs text-ink-soft">{s.body}</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  {target !== "caption" && (
                    <Button size="sm" onClick={() => apply(s)}>
                      Use this
                    </Button>
                  )}
                  {s.caption && (
                    <Button size="sm" variant="outline" onClick={() => copy(s)}>
                      <Copy /> Copy caption
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelSection>
  );
}
