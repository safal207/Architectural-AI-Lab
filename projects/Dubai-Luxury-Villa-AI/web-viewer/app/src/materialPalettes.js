/** Shared concept palettes for the residence viewer, finish controls and project brief. */
export const MATERIAL_PALETTES = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Soft ivory, natural stone and warm walnut.",
    swatch: "#b29b80",
    familyColors: {
      stone: "#9f896f",
      plaster: "#c6bdaf",
      timber: "#d7bda6",
      deck: "#7f7061"
    }
  },
  {
    id: "sandstone",
    name: "Sandstone Warmth",
    description: "Sun-warmed mineral tones with honeyed timber.",
    swatch: "#a98461",
    familyColors: {
      stone: "#9f7958",
      plaster: "#b8a68f",
      timber: "#cfae90",
      deck: "#745f50"
    }
  },
  {
    id: "graphite-mineral",
    name: "Graphite Mineral",
    description: "Deeper stone, soft grey and rich walnut.",
    swatch: "#5c5751",
    familyColors: {
      stone: "#4d4944",
      plaster: "#8f8a83",
      timber: "#b69c8c",
      deck: "#55504b"
    }
  }
];

export const DEFAULT_MATERIAL_PALETTE = MATERIAL_PALETTES[0];
