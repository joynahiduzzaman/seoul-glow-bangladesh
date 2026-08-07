/**
 * Skin type and concern vocabularies for the product form.
 *
 * Fixed lists rather than free text: both are stored as JSON arrays and used as
 * filter chips on the product page, so a typo or a synonym ("oily" vs "Oily
 * skin") would silently create a value nothing matches. The Product model has
 * carried skinType and skinConcern from the start — only the admin form was
 * missing them, so no schema change is involved in surfacing them.
 */
export const SKIN_TYPES = [
  "Oily",
  "Dry",
  "Combination",
  "Normal",
  "Sensitive",
  "Acne-Prone",
  "Mature",
  "All Skin Types",
] as const;

export const SKIN_CONCERNS = [
  "Acne & Blemishes",
  "Dark Spots",
  "Dullness",
  "Dryness",
  "Fine Lines",
  "Large Pores",
  "Redness",
  "Uneven Texture",
  "Oiliness",
  "Sun Damage",
] as const;

export type SkinType = (typeof SKIN_TYPES)[number];
export type SkinConcern = (typeof SKIN_CONCERNS)[number];
