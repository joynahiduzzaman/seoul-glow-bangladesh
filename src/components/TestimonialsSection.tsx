import { Star } from "lucide-react";

interface TestimonialData {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  verified: boolean;
  user: { name: string };
  product: { name: string };
}

export default function TestimonialsSection({
  reviews,
  title,
  subtitle,
  limit = 3,
  backgroundColor,
}: {
  reviews: TestimonialData[];
  title?: string;
  subtitle?: string;
  limit?: number;
  backgroundColor?: string;
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="bg-beige/40 section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="container-px mx-auto">
        {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold text-center mb-3">{subtitle}</p>}
        <h2 className="section-title text-center mb-12">{title || "What Our Customers Say"}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.slice(0, limit).map((r) => (
            <div key={r.id} className="card-surface p-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < r.rating ? "fill-rose-gold text-rose-gold" : "text-ink/15"} />
                  ))}
                </div>
                {r.verified && <span className="text-[10px] bg-pastel-green/50 rounded-full px-2 py-0.5">Verified Purchase</span>}
              </div>
              {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
              <p className="text-sm text-ink/70 mb-4 line-clamp-4">{r.comment}</p>
              <p className="text-xs text-ink/70">{r.user.name} · on {r.product.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
