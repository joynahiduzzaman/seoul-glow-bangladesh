// The canonical 5-step Korean skincare routine order, keyed by Category.slug —
// single source of truth for "Build Your Routine" on the product page so the
// step order can never drift between the data-fetching code and the display.
export const ROUTINE_STEPS = [
  { slug: "cleanser", label: "Cleanser" },
  { slug: "toner", label: "Toner" },
  { slug: "serum", label: "Serum" },
  { slug: "moisturizer", label: "Moisturizer" },
  { slug: "sunscreen", label: "Sunscreen" },
] as const;
