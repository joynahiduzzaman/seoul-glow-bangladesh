import { Droplet } from "lucide-react";

// Short, factual benefit blurbs for common K-beauty actives — shown when a product's
// ingredient list matches one of these (case-insensitive substring match). Anything
// not in this list is listed by name only rather than given an invented claim.
const INGREDIENT_BENEFITS: Record<string, string> = {
  "niacinamide": "Brightens tone & minimizes the look of pores",
  "centella asiatica": "Soothes redness & supports skin repair",
  "cica": "Calms irritation & strengthens the skin barrier",
  "hyaluronic acid": "Draws in and holds onto deep hydration",
  "snail mucin": "Repairs texture & locks in moisture",
  "snail secretion filtrate": "Repairs texture & locks in moisture",
  "retinol": "Supports renewal & smooths fine lines over time",
  "vitamin c": "Brightens tone & helps even out dark spots",
  "salicylic acid": "Unclogs pores & gently exfoliates",
  "ceramide": "Strengthens the skin barrier & reduces moisture loss",
  "peptide": "Supports firmness & skin elasticity",
  "green tea": "Antioxidant-rich, calms and protects skin",
  "propolis": "Nourishes & supports a healthy-looking glow",
  "adenosine": "Helps smooth the look of fine lines",
  "panthenol": "Softens and soothes dry or sensitive skin",
  "rice": "Brightens and softens for a smoother texture",
  "ginseng": "Supports firmness and a revitalized look",
  "tea tree": "Helps calm blemish-prone skin",
  "aha": "Gently exfoliates for smoother-looking skin",
  "bha": "Clears pores & smooths uneven texture",
  "collagen": "Supports plumpness & skin elasticity",
  "shea butter": "Deeply nourishes & softens dry skin",
  "aloe vera": "Soothes and hydrates on contact",
};

/** Trailing editorial note baked into the ingredient string, e.g.
 *  "Panthenol (full INCI list on packaging)." — a note about the list, not part
 *  of the ingredient's name. Matched narrowly so a genuine parenthetical such as
 *  "Niacinamide (5%)" is left alone. */
const LIST_NOTE = /\s*\([^)]*(?:inci|packaging|full list|see pack)[^)]*\)\s*\.?\s*$/i;

function cleanName(raw: string): string {
  return raw.replace(LIST_NOTE, "").replace(/\.\s*$/, "").trim();
}

function benefitFor(ingredient: string): string | null {
  const lower = ingredient.toLowerCase();
  const match = Object.keys(INGREDIENT_BENEFITS).find((key) => lower.includes(key));
  return match ? INGREDIENT_BENEFITS[match] : null;
}

/**
 * The formula, split by what can actually be said about it.
 *
 * Ingredients we hold a factual line for are featured with that line; the rest
 * are listed by name. Previously every ingredient got an identical card and the
 * unrecognised ones were padded with "A key ingredient in this formula", which
 * gave water and glycerin the same visual weight as the actives while saying
 * nothing. Splitting them is what makes the actives findable at a glance.
 */
export default function IngredientHighlights({ ingredients }: { ingredients: string[] }) {
  if (ingredients.length === 0) return null;

  const parsed = ingredients.map((raw) => ({
    name: cleanName(raw),
    benefit: benefitFor(raw),
  })).filter((i) => i.name.length > 0);

  const featured = parsed.filter((i) => i.benefit);
  const rest = parsed.filter((i) => !i.benefit);
  const hasListNote = ingredients.some((raw) => LIST_NOTE.test(raw));

  return (
    <section className="mt-14 md:mt-20">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center sm:mb-8">
          <p className="eyebrow mb-2.5">What&rsquo;s inside</p>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ingredients</h2>
          {featured.length > 0 && (
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">
              What the key actives in this formula actually do for your skin.
            </p>
          )}
        </header>

        {featured.length > 0 && (
          // Same panel language as Key Benefits so the two sections read as a
          // pair rather than two different components stacked.
          <ul className="overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e1">
            {featured.map((item, i) => (
              <li
                key={item.name}
                className={`flex items-start gap-3.5 px-5 py-4 sm:px-6 sm:py-5 ${i > 0 ? "border-t border-border-soft" : ""}`}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-gold/20 to-soft-pink/60 text-rose-gold-text"
                  aria-hidden="true"
                >
                  <Droplet size={14} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold capitalize leading-snug text-ink">{item.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-body">{item.benefit}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {rest.length > 0 && (
          <div className={featured.length > 0 ? "mt-6" : ""}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">
              Also formulated with
            </h3>
            <ul className="flex flex-wrap gap-2">
              {rest.map((item) => (
                <li
                  key={item.name}
                  className="rounded-full border border-border-soft bg-white px-3.5 py-1.5 text-xs font-medium capitalize text-ink/70"
                >
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasListNote && (
          <p className="mt-5 text-xs leading-relaxed text-ink/45">
            The complete INCI list is printed on the packaging.
          </p>
        )}
      </div>
    </section>
  );
}
