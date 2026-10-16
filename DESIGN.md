---
name: Bubble Studio
description: A Facebook post and reel editor in a Canva-style palette, framed as a proof on the workbench.
colors:
  make-ready-table: "#ebecf0"
  proof-sheet: "#ffffff"
  hairline-rule: "#dcdee4"
  input-rule: "oklch(0.83 0.008 250)"
  press-ink: "#0e1318"
  soft-ink: "#5e6573"
  muted-sheet: "oklch(0.945 0.005 250)"
  aqua: "#00c4cc"
  aqua-ink: "#00737a"
  aqua-wash: "#e3f8f9"
  brand: "#7d2ae8"
  brand-ink: "#6420c7"
  brand-wash: "#f1e9fd"
  process-yellow: "oklch(0.89 0.17 98)"
  destructive-red: "oklch(0.55 0.21 27)"
typography:
  title:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  readout:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tnum"
  slug:
    fontFamily: "Poppins, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.06em"
rounded:
  swatch: "3px"
  sm: "3.6px"
  md: "4.8px"
  lg: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.brand-ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.press-ink}"
    rounded: "{rounded.lg}"
    size: "32px"
  tool-rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.soft-ink}"
    rounded: "{rounded.md}"
    size: "56px"
  tool-rail-item-active:
    backgroundColor: "{colors.aqua-wash}"
    textColor: "{colors.aqua-ink}"
  input:
    backgroundColor: "{colors.proof-sheet}"
    textColor: "{colors.press-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  panel:
    backgroundColor: "{colors.proof-sheet}"
    textColor: "{colors.press-ink}"
    padding: "16px 16px 20px"
---

# Design System: Bubble Studio

## Overview

**Creative North Star: "The Press Proof on the Make-Ready Table"**

The editor is a print shop's proofing bench. The post sits as a cool paper-white sheet on a light grey make-ready ground, framed by crop marks and registration targets, and the chrome around it (top bar, tool rail, properties panel) is the same paper, divided by hairline rules. Type is press ink. Colour follows the Canva palette (turquoise, purple, near-black on a light grey workspace, chosen by the user) and is reserved: each accent carries one job, so colour in the UI always means something.

Density is calm and tool-like: 13px labels, tabular readouts, generous panel padding, no decoration that competes with the photo. The world rejects the generic grey editor with a single purple accent; its identity comes from prepress material (marks, ink roles, the CMYK colour bar), while every label stays in plain English.

**Key Characteristics:**
- Paper sheet on grey table; chrome is flat paper separated by 1px rules.
- Aqua (Canva turquoise) = selection and active tool; Brand (Canva purple) = text layers and the primary action; yellow = crop.
- Crop marks and registration targets frame the canvas; a CMYK colour bar leads the status strip.
- Numbers are tabular mono readouts; the status label is a condensed-caps slug.

## Colors

A near-neutral base (Canva's #ebecf0 workspace, white panels, #0e1318 text) with Canva turquoise and purple, plus a crop yellow, used strictly as functional signals. 

### Primary
- **Brand Purple** (`brand`): the Export button, the Download button, the empty-state "Choose a photo" action, the text-layer glyph in the layer list, centre snap guides while dragging text, and the input caret. Hovers deepen to **Brand Ink**; **Brand Wash** is the hover fill on text-style tiles.

### Secondary
- **Aqua** (`aqua`, Canva turquoise): selection and focus. Selected text-layer ring, focus rings, slider thumb border, selected swatch/filter ring, drop-target outline. **Aqua Wash** fills the active tool and selected list row; **Aqua Ink** is the active-tool label, selected filter name, and a slider value that differs from its default.

### Tertiary
- **Process Yellow** (`process-yellow`): crop only. The crop frame border and its four corner handles.

### Neutral
- **Make-Ready Table** (`make-ready-table`): app background behind the canvas.
- **Proof Sheet** (`proof-sheet`): top bar, tool rail, properties panel, popovers, inputs, the canvas sheet.
- **Hairline Rule** (`hairline-rule`): every divider and panel border; **Input Rule** is the slightly darker field stroke.
- **Press Ink** (`press-ink`): headings, body, crop marks, the slider fill, the brand mark.
- **Soft Ink** (`soft-ink`): labels, secondary text, inactive tools, readouts at rest.
- **Muted Sheet** (`muted-sheet`): hover fill for rail and list items, slider track.
- **Destructive Red** (`destructive-red`): remove/delete actions only.

### Named Rules
**The One Accent, One Job Rule.** Each accent has exactly one meaning. Never use aqua for an action, purple for selection, or yellow outside crop. Nothing else in the chrome is coloured.

**The Accent Is Not Paint Rule.** Accents are signals, not decoration: no accent-coloured panels, headers or gradients.

## Typography

**Heading Font:** Poppins 500-700 for headings, panel titles and the wordmark (chosen by the user)
**UI Font:** Inter for body copy, labels and controls (chosen by the user)
**Readout Font:** Geist Mono, tabular numerals
**Slug Font:** Poppins 500, uppercase, 0.05em tracking

**Character:** Inter does the work; Poppins gives headings and the wordmark a rounder, friendlier voice; mono tabular numerals make every measurement read like a gauge; the uppercase slug is the one prepress voice.

### Hierarchy
- **Title** (600, 15px, -0.01em): the product name in the top bar.
- **Empty-state heading** (600, 18px): "Start with a photo" only.
- **Section** (600, 13px): panel section headings and popover titles (14px).
- **Body** (400, 14px): helper text, layer names; `text-pretty`.
- **Label** (400, 13px, Soft Ink): field labels above controls. Tool rail labels are 11px/500.
- **Readout** (400, 11-12px mono, tabular): slider values, hex values, size and zoom readouts, file extension.
- **Slug** (600, 12px, uppercase, 0.06em): the status-strip label ("Facebook post", "Crop · drag the frame").

### Named Rules
**The Tabular Gauge Rule.** Any number that changes as the user works is mono with tabular numerals, so it never jitters.

**The Plain English Slug Rule.** Condensed caps carry prepress tone, but the words stay ordinary. No prepress jargon in labels.

Poster typefaces in `src/lib/editor/fonts.ts` are user content for the post, not UI fonts; they never style chrome.

## Layout

Three-zone app shell, full-height with no page scroll: a 56px top bar; on desktop (md, 768px+) a 76px left tool rail, a flexible centre canvas, and a 320px right properties panel. Below md the rail drops to a bottom bar, the canvas takes min(56vh, 460px), and the panel stacks beneath it. The sheet is fitted at the post's ratio (1:1, 3:4, 16:9 or 9:16) into the centre with a 36px gutter on every side reserved for crop marks and registration targets; a 36px status strip sits under it. Panels are a stack of sections (16px sides, 16px top, 20px bottom) divided by hairline rules; controls inside use 8-20px gaps.

## Elevation & Depth

Flat chrome, one lifted object. Bars, rails and panels have no shadow and separate by hairline rules and the paper/table value step. Only the proof sheet itself is lifted off the table.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 1px 2px oklch(0.2 0.02 260 / 0.12), 0 12px 32px -12px oklch(0.2 0.02 260 / 0.28)`): the canvas sheet only.
- **Crop frame keyline** (`box-shadow: 0 0 0 1px oklch(0.2 0.012 260 / 0.5)`): dark keyline so the yellow crop frame reads on light photos.

### Named Rules
**The One Sheet Rule.** Only the proof sheet casts a shadow. Popovers and tooltips use the shadcn defaults; no new shadows on chrome.

## Shapes

Small, square-ish corners: 6px on buttons and inputs, 4.8px on rail items and list rows, 3px on swatches and filter thumbnails. The canvas sheet and crop frame are hard-cornered, like paper. Lines are 1px hairlines; selection rings are 1.5-2px; the crop frame is 2px with 4px corner handles.

## Components

### Buttons
- **Shape:** gently squared (6px), 32px tall; the dialog download button is 36px.
- **Primary:** Brand Purple with white text, 12px sides, Download/Export icon leading. Hover to Brand Ink. Used for Export and the first action of an empty state, nothing else.
- **Ghost / icon:** transparent 32px squares for undo and redo; hover to Muted Sheet. Disabled at 50% opacity.
- **Outline:** sheet background with hairline border, for secondary actions and toggle groups (JPG/PNG).

### Tool Rail
- 56px square items, icon over an 11px label, Soft Ink at rest, Muted Sheet on hover. Active is Aqua Wash with Aqua Ink and a heavier icon stroke. Tooltips show the single-key shortcut in mono.

### Inputs / Fields
- **Style:** 32px, 6px corners, Input Rule stroke on Proof Sheet, purple caret.
- **Focus:** aqua ring.
- **Range field:** label left in Soft Ink, mono readout right (turns Aqua Ink when changed from default), Muted Sheet track with Press Ink fill and a white thumb ringed aqua; bipolar sliders show a centre tick; double-click the label resets.
- **Colour field:** row of 24px swatches (3px corners, faint ink keyline), selected gets a aqua ring offset from the sheet; the last swatch is a turquoise-purple-yellow conic wheel for a custom colour.

### Filter Thumbnails
- Square live-rendered previews of the photo, 3px corners, three to a row; selected shows an offset aqua ring and a Aqua Ink semibold name.

### Proof Marks (signature)
- Corner crop marks (18px strokes offset 8px from the sheet, Press Ink, 1px; 2px in crop mode) and registration targets at the top, left and right midpoints (Press Ink at 50%). The brand mark is the Bubble Studio "B" app icon (/public/favicon.png: white B on a purple rounded square), shown at 28px with 7px corners; it is also the favicon.

### Crop Frame (signature)
- In crop mode the full photo is shown with a 2px Process Yellow frame, dark keyline, rule-of-thirds lines in white at 40%, and four L-shaped yellow corner handles.

### Status Strip (signature)
- 36px strip under the canvas: a four-chip colour bar (12px squares: aqua, brand purple, yellow, ink), the slug label, then size and zoom readouts in mono.

## Do's and Don'ts

### Do:
- **Do** keep chrome on Proof Sheet against the Make-Ready Table, divided by 1px Hairline Rules.
- **Do** use aqua for every selection and focus state, brand purple for the one primary action and text layers, yellow only for crop.
- **Do** set every live number in Geist Mono with tabular numerals.
- **Do** frame the canvas with crop marks and registration targets and keep the 36px gutter for them.
- **Do** keep labels in plain English even where the visual vocabulary is prepress.

### Don't:
- **Don't** add accent colours beyond aqua, brand purple and crop yellow.
- **Don't** give one accent two jobs (for example an aqua button or a purple selection ring).
- **Don't** add shadows to bars, rails, panels or cards; only the proof sheet lifts.
- **Don't** use poster typefaces from `src/lib/editor/fonts.ts` in the interface.
- **Don't** round the canvas sheet or crop frame.
