import { Star } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  verified: boolean;
  user: { name: string };
}

export default function ReviewCard({ review }: { review: Review }) {
  const initial = review.user.name.trim().charAt(0).toUpperCase();

  return (
    <div className="card-surface p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 font-display text-lg text-rose-gold-text">
          {initial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{review.user.name}</span>
            {review.verified && (
              <span className="text-[10px] bg-pastel-green/50 rounded-full px-2 py-0.5">Verified Purchase</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className={i < review.rating ? "fill-rose-gold text-rose-gold" : "text-ink/15"} />
            ))}
          </div>
          {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
          <p className="text-sm text-ink/70 leading-relaxed">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}
