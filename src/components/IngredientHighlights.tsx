import { Sparkles } from "lucide-react";

// Short, factual benefit blurbs for common K-beauty actives — shown when a product's
// ingredient list matches one of these (case-insensitive substring match). Anything
// not in this list still gets a card, just with a generic line instead of guessing.
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

function benefitFor(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  const match = Object.keys(INGREDIENT_BENEFITS).find((key) => lower.includes(key));
  return match ? INGREDIENT_BENEFITS[match] : "A key ingredient in this formula";
}

export default function IngredientHighlights({ ingredients }: { ingredients: string[] }) {
  if (ingredients.length === 0) return null;
  const shown = ingredients.slice(0, 8);

  return (
    <section className="mt-14 md:mt-20 max-w-4xl mx-auto">
      <h2 className="font-display text-2xl mb-2 text-center">Ingredient Highlights</h2>
      <p className="text-sm text-body text-center mb-8 max-w-md mx-auto">What the key actives in this formula actually do for your skin.</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {shown.map((ing) => (
          <div key={ing} className="card-surface p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold mb-3">
              <Sparkles size={15} />
            </span>
            <p className="text-sm font-medium text-ink mb-1 capitalize">{ing}</p>
            <p className="text-xs text-body leading-relaxed">{benefitFor(ing)}</p>
          </div>
        ))}
      </div>
      {ingredients.length > 8 && (
        <p className="text-xs text-body text-center mt-6">+ {ingredients.length - 8} more ingredients — see full list on packaging</p>
      )}
    </section>
  );
}
