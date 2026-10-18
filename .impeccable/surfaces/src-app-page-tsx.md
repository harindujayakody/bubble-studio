---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/editor/editor.tsx","src/components/editor/start-screen.tsx"]
---

# Editor surface brief

Scope: the start screen and the post/reel editor at `/` (src/app/page.tsx, src/components/editor/*). Mode: Operate.
Task: start a photo post or reel at a size, edit (filters, adjust, crop, text, elements, blur, layers, bulk), export. Used often, short sessions; also in the Electron desktop app. Light and dark themes, following the system by default.

User answers (2026-10-19): direction Canva-clean (replace the print-proof look); theme follows system with a header toggle and a Settings override; start page leads with create + continue (Post / Reel cards with sizes, saved draft, bulk shortcuts). Layers must be draggable with the mouse. Theme switching must be instant, with no lag or bloat in Electron.

## Direction contract

THESIS: A Canva-clean editor: the post floats on a calm workspace, and the tools sit beside it in the order you use them. It refuses the print-proof costume (crop marks, CMYK strip) and the grey editor with one accent.
OWN-WORLD: One brand-gradient header (purple to turquoise) carries the brand. Plain sheet panels (white, or charcoal in dark) with hairline rules and 8px corners. A duotone tool icon set whose fill lights up purple on the active tool. Purple marks the active tool, the primary action and text; turquoise marks canvas selection and focus; yellow is crop. Poppins headings, Inter UI, mono readouts.
STORY: The owner opens the app, picks "Photo post · Square" in one click from the start cards (or continues a saved draft), edits with the left rail and panel, reorders layers by dragging, and exports from the white pill in the header.
FIRST VIEWPORT: Editor: 56px gradient header (home mark, size menu, New, save status | undo, redo, theme, Layers, white Export pill). Desktop: 76px rail of duotone icons, then the 328px tool panel, then the workspace with the post floating at its ratio and a floating status pill below. Mobile: header, canvas, panel, bottom scrolling rail. Start: gradient hero band with "What will you make today?", two overlapping white create cards with size chips, then continue/bulk tiles.
FORM: Canva-clean, the user's pinned direction (option 1 of 2 offered). seed: none (unavailable)
SIGNATURE: Rail icons whose duo shape fills in on the active tool; the header gradient continues into the start hero.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
