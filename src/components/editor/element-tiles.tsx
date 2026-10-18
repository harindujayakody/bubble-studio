/**
 * Category art for the Elements browser: two stacked rounded cards, a tilted pale one behind
 * and a glossy gradient one in front carrying a white glyph. One drawing system for all.
 */
type Art = { from: string; to: string; back: string; glyph: React.ReactNode };

function Tile({ art, id }: { art: Art; id: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="size-full">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={art.from} />
          <stop offset="1" stopColor={art.to} />
        </linearGradient>
        <linearGradient id={`s-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="14" y="5" width="44" height="44" rx="11" fill={art.back} transform="rotate(10 36 27)" />
      <rect x="6" y="13" width="46" height="46" rx="12" fill={`url(#g-${id})`} />
      <rect x="6" y="13" width="46" height="46" rx="12" fill={`url(#s-${id})`} />
      <g transform="translate(29 36)" fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
        {art.glyph}
      </g>
    </svg>
  );
}

const ART: Record<string, Art> = {
  stickers: {
    from: "#ff7a59",
    to: "#ff3d81",
    back: "#ffc2d4",
    glyph: (
      <>
        <circle r="13" stroke="none" />
        <circle cx="-4.5" cy="-3" r="1.8" fill="#ff5470" stroke="none" />
        <circle cx="4.5" cy="-3" r="1.8" fill="#ff5470" stroke="none" />
        <path d="M-5.5 3.5c3 3.5 8 3.5 11 0" fill="none" stroke="#ff5470" strokeWidth="2.4" />
      </>
    ),
  },
  shapes: {
    from: "#2bd4c5",
    to: "#0a8fa8",
    back: "#a7efe6",
    glyph: (
      <>
        <path d="M-2-14 8-2H-12Z" stroke="none" />
        <circle cx="-7" cy="6" r="6" stroke="none" opacity="0.9" />
        <rect x="2" y="1" width="11" height="11" rx="2.5" stroke="none" opacity="0.8" />
      </>
    ),
  },
  animated: {
    from: "#b86bff",
    to: "#6a2ae8",
    back: "#dcc4ff",
    glyph: (
      <>
        <circle r="12.5" fill="none" strokeWidth="2.6" />
        <path d="M-3.5-6v12l9.5-6Z" stroke="none" />
        <path d="M12-13l1.4 3 3 1.4-3 1.4L12-4.2l-1.4-3-3-1.4 3-1.4Z" stroke="none" />
      </>
    ),
  },
  grids: {
    from: "#ff5fd2",
    to: "#c026d3",
    back: "#f8c4ee",
    glyph: (
      <>
        <rect x="-13" y="-12" width="12" height="24" rx="2.5" stroke="none" />
        <rect x="1" y="-12" width="12" height="11" rx="2.5" stroke="none" opacity="0.85" />
        <rect x="1" y="1" width="12" height="11" rx="2.5" stroke="none" opacity="0.7" />
      </>
    ),
  },
  gifs: {
    from: "#ff4d6d",
    to: "#ff8a00",
    back: "#ffd0a8",
    glyph: (
      <text x="0" y="5.5" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="Poppins, Inter, sans-serif" stroke="none">
        GIF
      </text>
    ),
  },
  emoji: {
    from: "#ffd23f",
    to: "#ff9f1c",
    back: "#ffe9a8",
    glyph: (
      <>
        <circle r="13" stroke="none" />
        <path d="M-6.5-4.5q2-2.5 4 0M2.5-4.5q2-2.5 4 0" fill="none" stroke="#e08a00" strokeWidth="2.2" />
        <path d="M-6.5 3h13q-1.5 6.5-6.5 6.5T-6.5 3Z" fill="#e08a00" stroke="none" />
      </>
    ),
  },
  upload: {
    from: "#4f9dff",
    to: "#2563eb",
    back: "#bcd7ff",
    glyph: (
      <>
        <path d="M0 6V-11M-7-4 0-11l7 7" fill="none" strokeWidth="3.2" />
        <path d="M-12 5v4a3 3 0 0 0 3 3H9a3 3 0 0 0 3-3V5" fill="none" strokeWidth="3.2" />
      </>
    ),
  },
  charts: {
    from: "#9b8cff",
    to: "#5b4bd8",
    back: "#d4ceff",
    glyph: (
      <>
        <rect x="-12" y="0" width="6" height="12" rx="1.5" stroke="none" />
        <rect x="-3" y="-8" width="6" height="20" rx="1.5" stroke="none" />
        <rect x="6" y="-14" width="6" height="26" rx="1.5" stroke="none" opacity="0.8" />
      </>
    ),
  },
  frames: {
    from: "#34d27b",
    to: "#119a56",
    back: "#b5f0cf",
    glyph: (
      <>
        <path d="M0-14l3.2 2.6 4-.8 1.4 3.8 3.8 1.4-.8 4L14 0l-2.6 3.2.8 4-3.8 1.4-1.4 3.8-4-.8L0 14l-3.2-2.6-4 .8-1.4-3.8-3.8-1.4.8-4L-14 0l2.6-3.2-.8-4 3.8-1.4 1.4-3.8 4 .8Z" stroke="none" />
        <path d="M-7 4l4-4 3 3 3-3 4 4" fill="none" stroke="#119a56" strokeWidth="2.2" />
      </>
    ),
  },
  mockups: {
    from: "#22c3d6",
    to: "#0e7c99",
    back: "#b0eef5",
    glyph: <path d="M-5-12h10l9 5-3.5 6.5L7-2.5V12H-7V-2.5L-10.5-.5-14-7Z" stroke="none" />,
  },
  three: {
    from: "#8b5cf6",
    to: "#db2777",
    back: "#e9c9ff",
    glyph: (
      <>
        <path d="M0-13 11-7v12L0 11-11 5V-7Z" stroke="none" opacity="0.9" />
        <path d="M-11-7 0-1l11-6M0-1v12" fill="none" stroke="#7c3aed" strokeWidth="1.8" />
      </>
    ),
  },
};

export type ElementCategory = keyof typeof ART;

export function CategoryArt({ id }: { id: ElementCategory }) {
  return <Tile art={ART[id]} id={id} />;
}
