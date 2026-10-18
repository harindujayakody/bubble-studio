---
name: Bubble Studio
description: A Canva-clean Facebook post and reel editor; the post floats on a calm workspace under one purple-to-turquoise brand gradient.
colors:
  workspace: "#ebecf0"
  sheet: "#ffffff"
  raised: "#ffffff"
  tile: "#f2f3f6"
  rule: "#e2e4ea"
  input-rule: "#cfd2da"
  ink: "#0e1318"
  ink-soft: "#5b6270"
  brand: "#7d2ae8"
  brand-ink: "#6420c7"
  brand-wash: "#f1e9fd"
  aqua: "#00c4cc"
  aqua-ink: "#00737a"
  aqua-wash: "#e1f7f8"
  crop-yellow: "oklch(0.89 0.17 98)"
  yellow-wash: "oklch(0.97 0.06 98)"
  destructive: "oklch(0.55 0.21 27)"
  gradient-start: "#5b1fc4"
  gradient-teal: "#0d9aa5"
  cta-ink: "#4b19ad"
  dark-workspace: "#0f1014"
  dark-sheet: "#1a1b20"
  dark-raised: "#23242b"
  dark-tile: "#25272e"
  dark-rule: "#2c2e36"
  dark-ink: "#eef0f4"
  dark-ink-soft: "#a2a8b5"
  dark-brand: "#8b3dff"
  dark-aqua: "#19d3da"
typography:
  display:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "clamp(26px, 4vw, 42px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
  section:
    fontFamily: "Poppins, Inter, ui-sans-serif, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  rail-label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
  readout:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\" 1"
rounded:
  swatch: "3px"
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  2xl: "14.4px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
  header: "56px"
  rail: "76px"
  panel: "328px"
components:
  header:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.sheet}"
    height: "{spacing.header}"
  button-export:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
  button-export-hover:
    backgroundColor: "#f3edff"
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
  button-primary-hover:
    backgroundColor: "{colors.brand-ink}"
  rail-tool:
    textColor: "{colors.ink-soft}"
    typography: "{typography.rail-label}"
    rounded: "{rounded.xl}"
    width: "58px"
  rail-tool-active:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.brand}"
    rounded: "{rounded.xl}"
    size: "40px"
  size-chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px 0 10px"
  size-chip-hover:
    backgroundColor: "{colors.brand-wash}"
  create-card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  tool-tile:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.xl}"
    padding: "12px"
  status-pill:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 14px"
  panel-section:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    padding: "16px 16px 20px"
  layer-row-selected:
    backgroundColor: "{colors.aqua-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Bubble Studio

## Overview

**Creative North Star: "The Calm Workspace"**

Bubble Studio is a Canva-clean editor. The post floats on a quiet grey workspace (dark: a near-black one), plain sheet panels sit beside it with hairline rules and 8px corners, and the tools run down a left rail in the order you use them. All the brand energy lives in one purple-to-turquoise gradient: the 56px header across the top of every screen, continued into the hero band on the start screen. Everything else is calm, so the post is the most colourful thing on screen.

Colour carries meaning, not decoration. Purple is the brand and marks what you are doing: the active tool, the primary action, text layers. Turquoise marks what is selected on the canvas and where keyboard focus is. Yellow means crop. Neutrals do the rest. The system ships in light and dark, switched by a `dark` class on `<html>` that swaps CSS variables only; transitions pause for one frame during the switch so the whole app recolours at once. The post sheet, and anything drawn on it, stays light in both themes because it is the user's artwork, not chrome.

This world rejects the print-proof costume it replaced (crop marks, registration targets, CMYK strips, proof slugs) and the grey editor with a single lonely accent.

**Key Characteristics:**
- One brand gradient, in exactly two places: the header and the start hero band.
- Plain sheet panels with hairline rules, 8px base radius, soft ambient shadows only on floating things.
- Purple = active / primary / text; turquoise = selection / focus; yellow = crop.
- An authored duotone icon set whose "duo" shape fills purple on the active tool.
- Poppins headings, Inter UI, Geist Mono for numeric readouts.
- Light and dark by CSS variables alone; the post sheet stays light in both.

## Colors

A cool neutral workspace with three meaning-bearing accents and one brand gradient.

### Primary
- **Bubble Purple** (brand; dark theme lifts to dark-brand): the active rail tool (icon tile wash plus duo fill), the primary in-panel action ("Add a photo"), text-layer glyphs in Layers and the Text panel, drag drop-lines, centre guides, chip hover borders, the caret. Its pressed/hover state is **Deep Purple** (brand-ink); its tint is **Lilac Wash** (brand-wash), used behind the active tool, icon tiles and hovered cards.

### Secondary
- **Canvas Turquoise** (aqua; dark theme lifts to dark-aqua): selection on the canvas (layer rings, corner handles, dashed move outline), every `:focus-visible` ring, the selected swatch ring. **Turquoise Ink** (aqua-ink) is its readable text form; **Turquoise Wash** (aqua-wash) fills the selected Layers row, text selection and the drop-to-replace overlay.

### Tertiary
- **Crop Yellow** (crop-yellow): the crop frame and its handles, nothing else. **Yellow Wash** (yellow-wash) backs advisory notes (bulk and media-tool hints).

### Neutral
- **Workspace** (workspace / dark-workspace): the app background the post floats on.
- **Sheet** (sheet / dark-sheet): rail, tool panel, cards, tiles.
- **Raised** (raised / dark-raised): popovers, the status pill, a dragged layer row.
- **Tile** (tile / dark-tile): icon wells, thumbnails, zoom chip, rail hover.
- **Hairline** (rule / dark-rule): every divider and card/chip border; **Input Rule** for field strokes.
- **Ink** and **Soft Ink** (ink / ink-soft, with dark equivalents): primary text and secondary text, labels and readouts.
- **Destructive Red**: remove actions only.

### The Brand Gradient
`linear-gradient(90deg, gradient-start 0%, brand 42%, gradient-teal 100%)` in light; a deeper `#2d1170 → #43169a → #0b5f67` in dark. Text and controls on it are white; the Export pill is the only filled control.

### Named Rules
**The Two Places Rule.** The brand gradient appears in the header and the start hero band, and nowhere else. No gradient buttons, panels, text or borders.

**The Meaning Rule.** Purple says "this is what you are doing", turquoise says "this is what is selected or focused", yellow says "crop". Never swap them, and never use one for decoration.

**The Light Sheet Rule.** The post sheet and everything drawn on it (selection handles, empty-state buttons, the empty-state icon disc) stay light in both themes, using literal light values rather than theme variables.

## Typography

**Display Font:** Poppins (with Inter, ui-sans-serif)
**Body Font:** Inter (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (with ui-monospace)

**Character:** Poppins gives headings a friendly geometric roundness that matches the bubble mark; Inter keeps dense panel UI legible; Geist Mono with tabular figures makes sizes, ratios, hex values and zoom read like instrument readouts.

### Hierarchy
- **Display** (700, 26px mobile to 42px desktop, 1.25, 0.01em, uppercase): the start-screen h1 only, white on the hero gradient.
- **Headline** (600, 20px mobile to 24px desktop): start-screen section headings ("Continue designing", "More tools").
- **Title** (600, 18px; 15px for tool tiles): create-card titles, tile titles, Settings app name.
- **Section** (600, 14px): tool-panel section headings.
- **Body** (400, 14px; 15px to 16px in the hero subline, max 52ch): descriptions, layer names, panel copy.
- **Label** (500, 13px): size chips, field labels, menu items.
- **Rail Label** (500, 11px; 600 when active): text under rail icons.
- **Readout** (Geist Mono, 11px to 12px, tabular): pixel dimensions, ratios, zoom %, hex values (uppercase), version numbers, shortcut keys.

### Named Rules
**The Heading Face Rule.** h1 to h3 are always Poppins; UI text is always Inter. Uppercase belongs to the start h1 alone.

**The Readout Rule.** Any number the user reads as a measurement (px, ratio, %, hex, version) is Geist Mono with tabular figures.

## Layout

The editor is a fixed shell: the 56px gradient header, then on desktop a 76px icon rail, a 328px tool panel, and the workspace that fills the rest with the post centred at its true ratio and a floating status pill beneath it. On mobile the order becomes header, canvas, panel, then the rail as a horizontally scrolling bottom bar of 58px-minimum buttons; Settings drops to the bottom of the rail on desktop.

The start screen is a centred column (max 72rem, 16px gutters mobile, 32px desktop). The hero band is a rounded gradient block; the two create cards overlap its bottom edge by 56px to 64px and sit two-up from md. "Continue designing" recents run in a 2 / 3 / 5 column grid; "More tools" tiles in 1 / 2 / 4 columns; a hairline-topped footer closes the page.

Spacing runs on a 4px base: 8px between chips, 12px to 16px between tiles and cards, 16px panel padding (20px bottom), 40px to 48px between start-screen sections.

## Elevation & Depth

Mostly flat with tonal layering (workspace, sheet, raised, tile). Shadows are soft and ambient, reserved for things that float: the post sheet, cards and tiles on the start screen, the status pill, popovers, a dragged layer row. Panels and the rail never carry shadows; they are separated by hairlines. Dark mode deepens the same shadows rather than lightening surfaces.

### Shadow Vocabulary
- **Sheet** (`0 1px 2px rgb(14 19 24 / 0.08), 0 16px 40px -16px rgb(14 19 24 / 0.28)`; dark `0 1px 2px rgb(0 0 0 / 0.5), 0 18px 44px -14px rgb(0 0 0 / 0.75)`): the post, card art, recent thumbnails.
- **Float** (`0 1px 2px rgb(14 19 24 / 0.06), 0 8px 24px -8px rgb(14 19 24 / 0.22)`; dark `0 1px 2px rgb(0 0 0 / 0.4), 0 10px 28px -8px rgb(0 0 0 / 0.7)`): create cards, tool tiles, status pill, overflow buttons, dragged rows.
- **CTA lift** (`0 1px 2px rgb(0 0 0 / 0.18)`): the white Export pill on the gradient.

### Named Rules
**The Float-Only Rule.** Only floating objects cast shadows. Docked chrome (rail, panel, header) is separated by hairlines or the gradient.

## Shapes

Gently rounded throughout from an 8px base radius (0.5rem), scaled: 4.8px, 6.4px, 8px, 11.2px, 14.4px. Buttons and rows use 8px; rail icon tiles and tool tiles use 11.2px; create cards and the hero band use 14.4px. Pills (size chips, the status pill, the Star link) are fully round. Colour swatches and thumbnail images keep a tight 3px so artwork reads square-edged. Borders are 1px hairlines; selection is drawn as 1.5px turquoise rings with 10px square white handles.

## Components

### Header
The gradient bar (56px). White ghost controls: transparent at rest, 16% white on hover or while their menu is open, 2px white focus ring. Left: home mark (30px icon) with wordmark, size menu, New, save status (dimmed to 72%). Right: undo, redo, theme toggle, Layers, Export.

### Buttons
- **Shape:** gently rounded (8px).
- **Export pill (signature primary):** white fill, deep purple ink (cta-ink), weight 600, 36px tall, CTA lift shadow; hover tints to `#f3edff`. In dark it is `#f4f0ff` with `#3a1488` ink. It is the only filled control on the gradient.
- **Primary (in panels and empty states):** Bubble Purple fill, white text, hover Deep Purple.
- **Ghost / outline:** shared shadcn variants on sheet surfaces; focus is a turquoise ring.

### Chips
- **Size chips:** fully round, 36px, hairline border on sheet, a small purple outline glyph of the shape, the name, then a mono ratio in soft ink. Hover: purple border on lilac wash.

### Cards / Containers
- **Create cards:** sheet, 14.4px radius, Float shadow, 16px to 20px padding; a 112px to 128px tile well holding tilted miniature art that straightens on hover; a purple ring when the New menu points at it.
- **Tool tiles:** sheet, 11.2px radius, Float shadow, 48px lilac icon well with a purple duotone icon; lift 2px on hover and the arrow turns purple.
- **Recent designs:** 4:3 tile well (lilac on hover) holding the saved thumbnail with Sheet shadow, a "Private" badge, a hover-revealed overflow menu, name in 14px semibold and a size and time line.
- **Panel sections:** hairline-separated blocks, 16px padding, Poppins 14px heading.

### Inputs / Fields
- **Range fields:** label in 13px soft ink, value as a mono readout.
- **Colour fields:** 24px swatches with 3px corners and an inset 15% ink ring, a conic turquoise-purple-yellow custom swatch, and a Palettes toggle. The selected swatch takes a 2px turquoise ring offset by 1px.
- **Focus:** turquoise `:focus-visible` ring everywhere; caret is purple.

### Navigation (Tool Rail)
76px sheet column (mobile: bottom scroller). Each tool is a 40px rounded icon tile over an 11px label. Rest: soft ink; hover: tile fill; active: lilac wash tile, purple icon whose duo shape fills with 26% purple, semibold label. Tooltips to the right show the shortcut in mono.

### Duotone Tool Icons (signature)
Authored outline icons on a 24px grid, 1.75 stroke, round caps and joins, each with exactly one shape marked "duo". The duo is transparent at rest, takes a 10% currentColor fill on hover, and fills `color-mix(brand 26%)` when the tool is active (150ms ease-out). Used in the rail, tool tiles and the merge glyph.

### Layers
Rows with a grip, a 36px checkerboard thumbnail and the name; the selected row is turquoise wash, text layers show a purple T glyph. Dragging lifts the row (raised, Float shadow, faint purple ring) and a 3px purple drop-line with a ring-headed end marks the slot.

### Canvas Overlays
- **Status pill:** raised, fully round, 32px, Float shadow; label, a hairline, mono dimensions, and a tile-chip mono zoom %.
- **Empty sheet:** on the always-light sheet: a white 48px disc with a purple icon, dark heading, a purple primary button and a white outline button, all in literal light values.
- **Selection:** 1.5px turquoise ring, 10px white square handles; crop uses the yellow frame.

### Settings
Theme as a three-way radio group (Light, Dark, System) where the chosen option's icon turns purple; app identity with mono version; export folder and update status (turquoise spinner).

## Do's and Don'ts

### Do:
- **Do** keep the brand gradient to the header and the start hero band.
- **Do** use purple for the active tool, the primary action and text layers; turquoise for canvas selection and focus; yellow for crop only.
- **Do** keep the white Export pill as the one filled control on the gradient.
- **Do** give every new tool icon a 24px grid, 1.75 stroke and exactly one "duo" shape.
- **Do** keep the post sheet and its overlays light in both themes.
- **Do** define every chrome colour as a CSS variable in both `:root` and `.dark`, so a theme switch is one repaint with transitions paused for a frame.
- **Do** set measurements, ratios, hex and zoom in Geist Mono with tabular figures.

### Don't:
- **Don't** add crop marks, registration targets, CMYK strips or proof-slug labels; that world is retired.
- **Don't** put shadows on docked chrome (rail, panel, header).
- **Don't** use turquoise for primary actions or purple for selection rings.
- **Don't** hard-code chrome colours outside the post sheet; theme variables only.
- **Don't** uppercase headings other than the start h1.
- **Don't** put small uppercase kicker labels above headings.
