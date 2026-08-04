import { Sparkles } from "lucide-react";

export default function ProductBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) return null;

  return (
    <section className="mt-14 md:mt-20">
      <h2 className="font-display text-2xl mb-8 text-center">Key Benefits</h2>
      <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
        {benefits.map((benefit) => (
          <div key={benefit} className="card-surface p-6 text-center flex flex-col items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
              <Sparkles size={18} />
            </span>
            <p className="text-sm font-medium text-ink">{benefit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
