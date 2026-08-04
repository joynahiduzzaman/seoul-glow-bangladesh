// Product texture — a single descriptive value (unlike skinType/skinConcern,
// which are multi-select). Single source of truth for the admin form's select
// options and the comparison table's display labels.

export const PRODUCT_TEXTURES = [
  "GEL",
  "CREAM",
  "FOAM",
  "OIL",
  "WATER",
  "BALM",
  "LIQUID",
  "POWDER",
  "STICK",
] as const;
export type ProductTexture = (typeof PRODUCT_TEXTURES)[number];

export const PRODUCT_TEXTURE_LABELS: Record<ProductTexture, string> = {
  GEL: "Gel",
  CREAM: "Cream",
  FOAM: "Foam",
  OIL: "Oil",
  WATER: "Water-like",
  BALM: "Balm",
  LIQUID: "Liquid/Essence",
  POWDER: "Powder",
  STICK: "Stick",
};
