"use client";

import { useSyncExternalStore } from "react";

/**
 * Interface language: English or Sinhala. Strings are looked up by their English text, so any
 * string without a translation simply stays English. Shared building blocks (panel titles,
 * sliders, colour pickers, segmented controls, the tool rail) translate their labels, which
 * covers most of the interface without touching every call site.
 * shortcut: Sinhala wording written in-house; have a native speaker review before calling it final.
 */
export type Lang = "en" | "si";

const KEY = "bubble-studio:lang";
const listeners = new Set<() => void>();
let current: Lang | null = null;

function read(): Lang {
  if (current) return current;
  try {
    current = localStorage.getItem(KEY) === "si" ? "si" : "en";
  } catch {
    current = "en";
  }
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "en",
  );
}

/** A translate function for the current language; re-renders the component when it changes. */
export function useT() {
  const lang = useLang();
  return (en: string) => (lang === "si" ? (SI[en] ?? en) : en);
}

const SI: Record<string, string> = {
  // Tool rail
  Photo: "ඡායාරූපය",
  Video: "වීඩියෝව",
  Filters: "පෙරහන්",
  Adjust: "සකසන්න",
  Crop: "කපන්න",
  Text: "පෙළ",
  Elements: "අංග",
  Draw: "අඳින්න",
  Blur: "බොඳ කරන්න",
  Bulk: "තොග",
  Settings: "සැකසුම්",

  // Start page
  "What will you make today?": "අද ඔබ නිර්මාණය කරන්නේ කුමක්ද?",
  "Facebook posts from a photo, reels from a video. Pick a size to start; you can change it later.":
    "ඡායාරූපයකින් Facebook පෝස්ට්, වීඩියෝවකින් රීල්ස්. ආරම්භ කිරීමට ප්‍රමාණයක් තෝරන්න; පසුව එය වෙනස් කළ හැක.",
  "Photo post": "ඡායාරූප පෝස්ට්",
  "Filters, text, stickers and blur on a photo. Exports JPG or PNG.": "ඡායාරූපයකට පෙරහන්, පෙළ, ස්ටිකර් සහ බොඳ කිරීම. JPG හෝ PNG ලෙස සුරකියි.",
  "Video reel": "වීඩියෝ රීල්",
  "Text and stickers timed over a clip, with music. Exports a video.": "ක්ලිප් එකක් මත කාලයට පෙළ සහ ස්ටිකර්, සංගීතය සමඟ. වීඩියෝවක් ලෙස සුරකියි.",
  "More tools": "තවත් මෙවලම්",
  "Bulk edit photos": "ඡායාරූප එකවර සංස්කරණය",
  "One design on many photos": "එක් නිර්මාණයක් ඡායාරූප රැසකට",
  "Bulk edit reels": "රීල්ස් එකවර සංස්කරණය",
  "One design on many clips": "එක් නිර්මාණයක් ක්ලිප් රැසකට",
  "Photo slideshow": "ඡායාරූප ස්ලයිඩ්ෂෝ",
  "Turn photos into a reel": "ඡායාරූප රීල් එකක් බවට",
  "Merge videos": "වීඩියෝ එකතු කරන්න",
  "Join clips into one video": "ක්ලිප් එක් වීඩියෝවකට එක් කරන්න",
  "Extract audio": "ශබ්දය වෙන් කරන්න",
  "Save the sound from a video": "වීඩියෝවක ශබ්දය සුරකින්න",
  "Start from a template": "සැකිල්ලකින් අරඹන්න",
  "Continue designing": "නිර්මාණය දිගටම කරන්න",
  "Open file": "ගොනුව විවෘත කරන්න",
  "Custom size": "අභිමත ප්‍රමාණය",
  Square: "සමචතුරස්‍ර",
  Portrait: "සිරස්",
  Landscape: "තිරස්",
  Story: "ස්ටෝරි",
  Reel: "රීල්",
  Feed: "ෆීඩ්",
  Original: "මුල් ප්‍රමාණය",
  "Square 1:1": "සමචතුරස්‍ර 1:1",
  "Feed 4:5": "ෆීඩ් 4:5",
  "Story 9:16": "ස්ටෝරි 9:16",
  "Add page (carousel)": "පිටුවක් එක් කරන්න (කැරසල්)",
  All: "සියල්ල",
  "My templates": "මගේ සැකිලි",
  "Grand opening": "විවෘත කිරීම",
  Sale: "වට්ටම්",
  "New arrival": "අලුත් තොග",
  "Food and menu": "ආහාර සහ මෙනු",
  "Opening hours": "විවෘත වේලාවන්",
  "Thank you": "ස්තූතියි",
  Festivals: "උත්සව",
  "Events and days": "සිදුවීම් සහ දින",
  Quotes: "උපුටා දැක්වීම්",
  "Social and photos": "සමාජ සහ ඡායාරූප",

  // Top bar and menus
  New: "නව",
  "New photo post": "නව ඡායාරූප පෝස්ට්",
  "Choose a size, then add a photo": "ප්‍රමාණයක් තෝරා ඡායාරූපයක් එක් කරන්න",
  "New video reel": "නව වීඩියෝ රීල්",
  "Save as template": "සැකිල්ලක් ලෙස සුරකින්න",
  "Reuse this layout from the start page": "මෙම පිරිසැලසුම මුල් පිටුවෙන් නැවත භාවිත කරන්න",
  "Save as file": "ගොනුවක් ලෙස සුරකින්න",
  "A .bubble file with its photos and videos": "ඡායාරූප සහ වීඩියෝ සහිත .bubble ගොනුවක්",
  "Continue a design saved as .bubble": ".bubble ලෙස සුරැකි නිර්මාණයක් දිගටම කරන්න",
  Export: "සුරකින්න",
  "Export post": "පෝස්ට් එක සුරකින්න",
  Format: "ආකෘතිය",
  Quality: "ගුණත්වය",
  "File name": "ගොනු නම",
  Layers: "ස්ථර",

  // Panel titles
  Background: "පසුබිම",
  "Add text": "පෙළ එක් කරන්න",
  "Write with AI": "AI සමඟ ලියන්න",
  "Saved phrases": "සුරැකි වාක්‍ය",
  "Text on this post": "මෙම පෝස්ට් එකේ පෙළ",
  Captions: "උපසිරැසි",
  Watermark: "ජල සලකුණ",
  Trim: "කපා ගන්න",
  "Cut and speed": "කැපීම සහ වේගය",
  "Original sound": "මුල් ශබ්දය",
  Music: "සංගීතය",
  Appearance: "පෙනුම",
  Language: "භාෂාව",
  Updates: "යාවත්කාලීන",
  "Export folder": "සුරකින ෆෝල්ඩරය",
  Storage: "ගබඩාව",
  About: "පිළිබඳ",
  "Brand kit": "සන්නාම කට්ටලය",
  "AI writer": "AI ලේඛක",

  // Common controls
  Size: "ප්‍රමාණය",
  Opacity: "පාරාන්ධතාව",
  Colour: "වර්ණය",
  "Text colour": "පෙළ වර්ණය",
  "Main colour": "ප්‍රධාන වර්ණය",
  Brightness: "දීප්තිය",
  Contrast: "වෙනස",
  Saturation: "වර්ණ ගැඹුර",
  Warmth: "උණුසුම",
  Rotation: "භ්‍රමණය",
  Speed: "වේගය",
  Style: "ශෛලිය",
  Position: "ස්ථානය",
  Zoom: "විශාලනය",
  "Word limit": "වචන සීමාව",
  "Brush size": "බුරුසු ප්‍රමාණය",
  Erase: "මකන්න",
  Restore: "යථා තත්ත්වයට",
  Type: "ටයිප් කරන්න",
  Headline: "සිරස්තලය",
  "Whole design": "සම්පූර්ණ නිර්මාණය",
  Caption: "විස්තරය",
  English: "English",
  Mixed: "මිශ්‍ර",
  Box: "කොටුව",
  Outline: "දාරය",
  Highlight: "උද්දීපනය",
  Reels: "රීල්ස්",
  Photos: "ඡායාරූප",
  Both: "දෙකම",
  Auto: "ස්වයංක්‍රීය",
  White: "සුදු",
  Black: "කළු",
  Bars: "තීරු",
  Line: "රේඛාව",
  Pie: "වට",
  Link: "සබැඳිය",
  Phone: "දුරකථනය",
  "Shot on": "Shot on",
  Badge: "ලාංඡනය",
  Minimal: "සරල",
  Signature: "අත්සන",

  // Help text in the main panels
  "Add a photo of your shop, product or event. It stays on your computer.": "ඔබේ සාප්පුවේ, නිෂ්පාදනයේ හෝ සිදුවීමේ ඡායාරූපයක් එක් කරන්න. එය ඔබේ පරිගණකයේම පවතී.",
  "Choose photo": "ඡායාරූපයක් තෝරන්න",
  "Shows behind the photo only where it doesn't reach.": "ඡායාරූපය නොමැති තැන්වල පමණක් පිටුපසින් පෙනේ.",
  "Your post's base colour. Add text on top for a quick announcement.": "ඔබේ පෝස්ට් එකේ මූලික වර්ණය. ඉක්මන් නිවේදනයක් සඳහා ඒ මත පෙළ එක් කරන්න.",
  "Most reels are watched with the sound off. Add lines that show one after another.": "බොහෝ රීල්ස් ශබ්දය නැතිව නරඹයි. එකින් එක පෙනෙන පේළි එක් කරන්න.",
  "Split at the playhead, then delete the parts you don't want. The rest plays back to back.": "වාදන ස්ථානයෙන් කපා, ඔබට අවශ්‍ය නැති කොටස් මකන්න. ඉතිරි කොටස් එකදිගට වාදනය වේ.",
  "Describe your post and get ready-to-use text in English, Sinhala or Tamil.": "ඔබේ පෝස්ට් එක විස්තර කර ඉංග්‍රීසි, සිංහල හෝ දෙමළ භාෂාවෙන් භාවිතයට සූදානම් පෙළ ලබා ගන්න.",
  "Add your OpenRouter key in": "සක්‍රිය කිරීමට ඔබේ OpenRouter යතුර",
  "Settings → AI writer": "සැකසුම් → AI ලේඛක",
  "to turn it on.": "තුළ එක් කරන්න.",
  "Added to every export until you turn it off, like “Shot on” on phone photos.": "ඔබ එය අක්‍රිය කරන තුරු සෑම සුරැකීමකටම එක් වේ, දුරකථන ඡායාරූපවල “Shot on” මෙන්.",
  "Sign your work with a “Shot on” line or your logo. It stays on for every export once turned on.": "“Shot on” පේළියකින් හෝ ඔබේ ලාංඡනයෙන් ඔබේ නිර්මාණය සලකුණු කරන්න. සක්‍රිය කළ පසු සෑම සුරැකීමකටම එය පවතී.",
  "Square post": "සමචතුරස්‍ර පෝස්ට්",
  "Portrait post": "සිරස් පෝස්ට්",
  "Story or reel": "ස්ටෝරි හෝ රීල්",
  "Original size": "මුල් ප්‍රමාණය",
};
