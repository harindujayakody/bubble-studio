"use client";

import { useSyncExternalStore } from "react";

/**
 * AI writer: post text from OpenRouter with the user's own key. Off until a key is added.
 * Only the prompt and the design's current words are sent, straight to OpenRouter.
 * Desktop: the key is encrypted by the main process (safeStorage), which also makes the request,
 * so the key never reaches the page. Web: the key stays in this browser's localStorage.
 */
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-2.5-flash";
/** Suggestions for the model field; any OpenRouter model id works. */
export const MODELS = ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-haiku-4.5", "deepseek/deepseek-chat"];

export type AIStatus = { hasKey: boolean; model: string };
export type AILanguage = "English" | "Sinhala" | "Tamil" | "Sinhala and English";
export type AITarget = "headline" | "design" | "caption";
export type Suggestion = { headline: string; subheading: string; body: string; caption: string; hashtags: string[] };
export type WriteRequest = { prompt: string; language: AILanguage; tone: string; words: number; target: AITarget; current: string[] };

/** What the desktop bridge returns for a chat call: the raw response, or a network error. */
export type AIChatResult = { status: number; text: string } | { error: string };

const KEY = "bubble-studio:ai";
const listeners = new Set<() => void>();
let status: AIStatus = { hasKey: false, model: DEFAULT_MODEL };
let loaded = false;

function webRead(): { key: string; model: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { key: typeof v.key === "string" ? v.key : "", model: typeof v.model === "string" && v.model ? v.model : DEFAULT_MODEL };
  } catch {
    return { key: "", model: DEFAULT_MODEL };
  }
}

function publish(next: AIStatus) {
  status = next;
  listeners.forEach((l) => l());
}

async function refresh() {
  const bridge = window.bubbleDesktop;
  if (bridge?.aiStatus) publish(await bridge.aiStatus());
  else {
    const w = webRead();
    publish({ hasKey: !!w.key, model: w.model });
  }
}

export function useAIStatus(): AIStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (!loaded) {
        loaded = true;
        void refresh();
      }
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** Save the key (empty keeps the current one) and model. */
export async function saveAI(key: string, model: string) {
  model = model.trim() || DEFAULT_MODEL;
  const bridge = window.bubbleDesktop;
  if (bridge?.aiSetKey) await bridge.aiSetKey(key.trim(), model);
  else localStorage.setItem(KEY, JSON.stringify({ key: key.trim() || webRead().key, model }));
  await refresh();
}

export async function removeAIKey() {
  const bridge = window.bubbleDesktop;
  if (bridge?.aiClear) await bridge.aiClear();
  else localStorage.removeItem(KEY);
  await refresh();
}

/** One chat completion; returns the reply text or throws an Error with a plain message. */
async function chat(messages: { role: "system" | "user"; content: string }[], maxTokens: number): Promise<string> {
  const body = { model: status.model, messages, max_tokens: maxTokens, temperature: 0.8 };
  const bridge = window.bubbleDesktop;
  let res: AIChatResult;
  if (bridge?.aiChat) res = await bridge.aiChat(body);
  else {
    const { key } = webRead();
    if (!key) throw new Error("Add your OpenRouter key in Settings → AI writer first.");
    try {
      const r = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Bubble Studio" },
        body: JSON.stringify(body),
      });
      res = { status: r.status, text: await r.text() };
    } catch {
      res = { error: "offline" };
    }
  }
  if ("error" in res) throw new Error(res.error === "no-key" ? "Add your OpenRouter key in Settings → AI writer first." : "Couldn't reach OpenRouter. Check your internet connection.");
  if (res.status !== 200) throw new Error(errorMessage(res.status, res.text));
  const content = JSON.parse(res.text)?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("The model sent an empty reply. Try again or pick another model.");
  return content;
}

function errorMessage(status: number, text: string) {
  if (status === 401) return "OpenRouter didn't accept this key. Check it in Settings → AI writer.";
  if (status === 402) return "Your OpenRouter account is out of credits.";
  if (status === 429) return "Too many requests right now. Wait a moment and try again.";
  if (status === 400 || status === 404) {
    let msg = "";
    try {
      msg = JSON.parse(text)?.error?.message ?? "";
    } catch {}
    return `OpenRouter couldn't use this model${msg ? `: ${msg}` : ""}. Pick another model in Settings.`;
  }
  return `OpenRouter had a problem (${status}). Try again in a moment.`;
}

/** Check the key and model with a tiny request. */
export async function testAI() {
  await chat([{ role: "user", content: "Reply with OK." }], 5);
}

const clip = (s: unknown, words: number) =>
  typeof s === "string" ? s.trim().split(/\s+/).filter(Boolean).slice(0, words).join(" ") : "";

/** Pull suggestions out of a model reply; tolerates code fences and text around the JSON. */
export function parseSuggestions(reply: string, words: number): Suggestion[] {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = (data as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => ({
      headline: clip(s?.headline, Math.max(3, Math.min(words, 12))),
      subheading: clip(s?.subheading, words),
      body: clip(s?.body, words * 2),
      caption: clip(s?.caption, 120),
      hashtags: (Array.isArray(s?.hashtags) ? s.hashtags : [])
        .filter((h: unknown): h is string => typeof h === "string" && !!h.trim())
        .slice(0, 8)
        .map((h: string) => "#" + h.trim().replace(/^#+/, "").replace(/\s+/g, "")),
    }))
    .filter((s) => s.headline || s.caption)
    .slice(0, 3);
}

/** Three suggestions for the request. */
export async function writePost(req: WriteRequest): Promise<Suggestion[]> {
  const system = [
    "You write short, natural text for Facebook posts and reels made by small businesses in Sri Lanka.",
    `Write in ${req.language}${req.language === "Sinhala" || req.language === "Tamil" ? ` (${req.language} script, natural everyday wording)` : ""}. Tone: ${req.tone}.`,
    `Headline: at most ${Math.min(req.words, 12)} words. Subheading: at most ${req.words} words. Body: at most ${req.words * 2} words.`,
    "Caption: 1–3 friendly sentences for the Facebook post itself. Hashtags: 3–6, without spaces.",
    "No made-up prices, dates, phone numbers or addresses unless the user gave them.",
    'Reply with JSON only: {"suggestions":[{"headline":"","subheading":"","body":"","caption":"","hashtags":[""]}]} with exactly 3 different suggestions.',
  ].join("\n");
  const current = req.current.filter((t) => t.trim()).slice(0, 8);
  const user = `${req.prompt.trim()}${current.length ? `\n\nText on the design now (rewrite to fit): ${current.map((t) => `"${t}"`).join(", ")}` : ""}`;
  const reply = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    1200,
  );
  const out = parseSuggestions(reply, req.words);
  if (!out.length) throw new Error("The model's reply couldn't be read. Try again or pick another model.");
  return out;
}
