/** Ready-made colour sets offered in the editor. */

export type GradientPreset = { name: string; stops: string[] };

/** Background gradients, drawn at 135° (top left to bottom right). */
export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: "Sunset Pop", stops: ["#F58529", "#DD2A7B", "#8134AF"] },
  { name: "Neon Night", stops: ["#FC466B", "#3F5EFB"] },
  { name: "Electric Violet", stops: ["#4776E6", "#8E54E9"] },
  { name: "Ocean Breeze", stops: ["#2193B0", "#6DD5ED"] },
  { name: "Mojito", stops: ["#11998E", "#38EF7D"] },
  { name: "Golden Hour", stops: ["#F7971E", "#FFD200"] },
  { name: "Coral Reef", stops: ["#FF5F6D", "#FFC371"] },
  { name: "Cotton Candy", stops: ["#FBC2EB", "#A6C1EE"] },
  { name: "Aurora", stops: ["#00C9FF", "#92FE9D"] },
  { name: "Royal Berry", stops: ["#8E2DE2", "#4A00E0"] },
  { name: "Peach Fuzz", stops: ["#FF9A8B", "#FF6A88", "#FF99AC"] },
  { name: "Midnight Steel", stops: ["#0F2027", "#203A43", "#2C5364"] },
  { name: "Cherry Blossom", stops: ["#EE9CA7", "#FFDDE1"] },
  { name: "Deep Space", stops: ["#000428", "#004E92"] },
  { name: "Mango Tango", stops: ["#FF8008", "#FFC837"] },
  { name: "Lavender Mist", stops: ["#C471F5", "#FA71CD"] },
  { name: "Emerald Water", stops: ["#348F50", "#56B4D3"] },
  { name: "Fire Red", stops: ["#F12711", "#F5AF19"] },
  { name: "Blue Lagoon", stops: ["#43C6AC", "#191654"] },
  { name: "Pink Lemonade", stops: ["#F857A6", "#FF5858"] },
];

/** CSS for a preset tile, matching how the canvas draws it. */
export const gradientCss = (stops: string[]) => `linear-gradient(135deg, ${stops.join(", ")})`;

export type SolidPalette = { name: string; colors: { hex: string; name: string }[] };

/** Solid colour sets shown under every colour picker. */
export const SOLID_PALETTES: SolidPalette[] = [
  {
    name: "Bold and Modern",
    colors: [
      { hex: "#FF6B6B", name: "coral red" },
      { hex: "#FFD93D", name: "sunny yellow" },
      { hex: "#6BCB77", name: "fresh green" },
      { hex: "#4D96FF", name: "bright blue" },
      { hex: "#FFFFFF", name: "white" },
    ],
  },
  {
    name: "Soft Pastel",
    colors: [
      { hex: "#FFC8DD", name: "blush pink" },
      { hex: "#FFAFCC", name: "rose" },
      { hex: "#BDE0FE", name: "baby blue" },
      { hex: "#A2D2FF", name: "sky blue" },
      { hex: "#CDB4DB", name: "lilac" },
    ],
  },
  {
    name: "Earthy Neutral",
    colors: [
      { hex: "#EDE0D4", name: "cream" },
      { hex: "#E6CCB2", name: "sand" },
      { hex: "#DDB892", name: "tan" },
      { hex: "#B08968", name: "caramel" },
      { hex: "#7F5539", name: "brown" },
    ],
  },
  {
    name: "Dark Luxury",
    colors: [
      { hex: "#0D0D0D", name: "black" },
      { hex: "#1F1F1F", name: "charcoal" },
      { hex: "#C9A227", name: "gold" },
      { hex: "#E5E5E5", name: "light gray" },
      { hex: "#FFFFFF", name: "white" },
    ],
  },
  {
    name: "Ocean Calm",
    colors: [
      { hex: "#03045E", name: "navy" },
      { hex: "#0077B6", name: "ocean blue" },
      { hex: "#00B4D8", name: "cyan" },
      { hex: "#90E0EF", name: "aqua" },
      { hex: "#CAF0F8", name: "ice blue" },
    ],
  },
  {
    name: "Warm Sunset",
    colors: [
      { hex: "#264653", name: "deep teal" },
      { hex: "#2A9D8F", name: "teal" },
      { hex: "#E9C46A", name: "mustard" },
      { hex: "#F4A261", name: "orange" },
      { hex: "#E76F51", name: "burnt coral" },
    ],
  },
  {
    name: "Minimal Clean",
    colors: [
      { hex: "#FFFFFF", name: "white" },
      { hex: "#F5F5F5", name: "off-white" },
      { hex: "#D4D4D4", name: "light gray" },
      { hex: "#525252", name: "gray" },
      { hex: "#171717", name: "near black" },
    ],
  },
  {
    name: "Vibrant Pop",
    colors: [
      { hex: "#7400B8", name: "purple" },
      { hex: "#5E60CE", name: "indigo" },
      { hex: "#48BFE3", name: "sky" },
      { hex: "#64DFDF", name: "turquoise" },
      { hex: "#80FFDB", name: "mint" },
    ],
  },
  {
    name: "Nature Green",
    colors: [
      { hex: "#081C15", name: "forest" },
      { hex: "#1B4332", name: "pine" },
      { hex: "#40916C", name: "leaf" },
      { hex: "#95D5B2", name: "sage" },
      { hex: "#D8F3DC", name: "mint cream" },
    ],
  },
  {
    name: "Retro Vintage",
    colors: [
      { hex: "#F4F1DE", name: "ivory" },
      { hex: "#E07A5F", name: "terracotta" },
      { hex: "#3D405B", name: "slate blue" },
      { hex: "#81B29A", name: "sage green" },
      { hex: "#F2CC8F", name: "wheat" },
    ],
  },
];
