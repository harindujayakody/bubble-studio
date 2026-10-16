---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Editor surface brief

Scope: the single-page post editor at `/` (src/app/page.tsx and src/components/editor/*). Mode: Operate.
Task: load a photo, filter, adjust, crop, add text, export 1080×1080 JPG/PNG. Used often, short sessions.

## Direction contract

FORM: seed:3d95ee875b124a6f — chosen card: pick (print-shop press proof).
THESIS: The canvas is a press proof on the make-ready table. Refuses the grey Canva clone with one purple accent.
OWN-WORLD: Cool paper-white sheet on a light mid-grey make-ready ground; ink-black type; process inks cyan, magenta, process yellow used as functional roles only (cyan = selection/active tool, magenta = text layers & primary action, yellow = crop/warning). Hairline rules, tabular numerals, condensed caps for measurement labels.
STORY: Owner drops a photo, sees it framed as a proof, tries filters with live thumbnails, adds a headline, exports a print-ready file.
FIRST VIEW: Top bar (name, size readout, undo/redo, export). Left tool rail. Center canvas with crop marks + registration targets at the corners. Right properties panel per tool.
SIGNATURE: Crop marks and registration targets around the canvas; in crop mode the marks become the live crop handles, and a CMYK colour-bar strip under the canvas acts as the swatch row.
RISK: Prepress vocabulary can read as jargon — labels stay in plain English.
