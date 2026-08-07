/** Shared vocabulary for the A–Z indexes on the brand and category directories. */

export const ALL = "ALL";
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Bucket for anything not starting with A–Z — "3CE", "24k Gold" and the like.
 *  Only offered when such an entry actually exists. */
export const OTHER = "#";

export function initialOf(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : OTHER;
}

/** The set of initials actually present, so empty letters can be shown inert. */
export function initialsOf(names: string[]): Set<string> {
  return new Set(names.map(initialOf));
}

export function filterByInitial<T>(items: T[], active: string, nameOf: (item: T) => string): T[] {
  if (active === ALL) return items;
  return items.filter((item) => initialOf(nameOf(item)) === active);
}
