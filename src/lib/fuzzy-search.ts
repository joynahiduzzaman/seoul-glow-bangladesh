// Lightweight typo-tolerance layer for the search API. SQLite's `LIKE` (what
// Prisma's `contains` compiles to) only ever does exact substring matches — a
// customer typing "sunscren" or "seurm" gets zero results. Rather than adding a
// dedicated search engine (Algolia/Meilisearch/Postgres trigram — a much bigger
// architecture change than a typo-tolerant fallback justifies), this scores
// candidates in JS with a small Levenshtein-distance check and is only ever run
// over a capped candidate set, never the whole catalog.

/** Classic edit-distance, capped so a wildly different string bails out early
 * rather than computing the full O(n*m) table for an obviously-bad match. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        currentRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currentRow;
  }
  return prevRow[b.length];
}

/** True if `query` plausibly means `target` — either a direct substring (the
 * fast path the DB already handles) or close enough by edit distance, scaled
 * to word length so "1-2 typos" stays forgiving on longer words without also
 * matching completely unrelated short ones. */
export function isFuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return false;
  if (t.includes(q)) return true;

  // Compare against each word in the target, not just the whole string — "snail"
  // should fuzzy-match inside "Advanced Snail 96 Mucin Power Essence" even though
  // the two full strings are nowhere near each other by edit distance.
  const words = t.split(/\s+/);
  const maxDistance = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;
  return words.some((word) => {
    if (Math.abs(word.length - q.length) > maxDistance) return false;
    return levenshtein(q, word) <= maxDistance;
  });
}
