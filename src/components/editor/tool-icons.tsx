import type { SVGProps } from "react";

/**
 * Bubble Studio's tool icons. Each is an outline on a 24px grid, 1.75 stroke, with one
 * "duo" shape that fills in when its tool is active (see the rail styles in editor.tsx).
 */
export type ToolIcon = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const PhotoIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <rect className="duo" x="3" y="4" width="18" height="16" rx="3.5" />
    <path d="m3.5 17 4.8-4.8a1.5 1.5 0 0 1 2.1 0L15 16.8" />
    <path d="m13.5 15.3 1.7-1.7a1.5 1.5 0 0 1 2.1 0l3.4 3.4" />
    <circle cx="15.5" cy="8.75" r="1.5" />
  </Svg>
);

export const VideoIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3.5" />
    <path className="duo" d="M10 9.2v5.6a.6.6 0 0 0 .9.5l4.6-2.8a.6.6 0 0 0 0-1l-4.6-2.8a.6.6 0 0 0-.9.5Z" />
  </Svg>
);

export const FiltersIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <circle className="duo" cx="9" cy="9.5" r="5.25" />
    <circle cx="15" cy="9.5" r="5.25" />
    <circle cx="12" cy="14.75" r="5.25" />
  </Svg>
);

export const AdjustIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <path d="M4 7h4M12 7h8M4 17h10M18 17h2M4 12h2M10 12h10" />
    <circle className="duo" cx="10" cy="7" r="2.25" />
    <circle className="duo" cx="8" cy="12" r="2.25" />
    <circle className="duo" cx="16" cy="17" r="2.25" />
  </Svg>
);

export const CropIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <rect className="duo" x="7.5" y="7.5" width="9" height="9" rx="1" strokeWidth="0" />
    <path d="M6.5 2.5v12.5a2.5 2.5 0 0 0 2.5 2.5h12.5" />
    <path d="M17.5 21.5V9A2.5 2.5 0 0 0 15 6.5H2.5" />
  </Svg>
);

export const TextIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <rect className="duo" x="3" y="3" width="18" height="18" rx="4.5" />
    <path d="M8 8.25h8M12 8.25v8" />
  </Svg>
);

export const ElementsIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <circle className="duo" cx="7.5" cy="7.5" r="4.25" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
    <path d="M16.8 3.4a.5.5 0 0 1 .9 0l3.4 5.9a.5.5 0 0 1-.4.7h-6.9a.5.5 0 0 1-.4-.7Z" />
    <path d="M4 14.5l6 6M10 14.5l-6 6" />
  </Svg>
);

export const BlurIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <path className="duo" d="M12 3.2s-6.25 6.6-6.25 11.05a6.25 6.25 0 0 0 12.5 0C18.25 9.8 12 3.2 12 3.2Z" />
    <path d="M9.5 15.5a2.75 2.75 0 0 0 2.5 2.25" />
  </Svg>
);

export const BulkIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <rect className="duo" x="7.5" y="3" width="13.5" height="13.5" rx="3" />
    <path d="M3.5 7.5v10A3.5 3.5 0 0 0 7 21h10" />
    <path d="m10.5 13 2.4-2.4a1.2 1.2 0 0 1 1.7 0l3 3" />
  </Svg>
);

export const SettingsIcon: ToolIcon = (p) => (
  <Svg {...p}>
    <path
      className="duo"
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
    />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
