import { Check } from "lucide-react";

const STEPS = ["PENDING", "PACKED", "SHIPPED", "DELIVERED"] as const;

export default function OrderStatusTracker({ status }: { status: string }) {
  // CANCELLED/RETURNED/REFUNDED don't fit the linear progress model — shown as
  // their own state. A DRAFT order shouldn't reach this component at all (it's
  // filtered out of every customer-facing order query), but if it somehow did,
  // showing nothing is safer than a misleading "just placed" progress bar.
  if (status === "CANCELLED" || status === "RETURNED" || status === "REFUNDED") {
    return <p className="text-sm text-badge-sale font-medium">This order was {status.toLowerCase()}.</p>;
  }
  if (status === "DRAFT") return null;

  // CONFIRMED counts as "past Pending, not yet Packed" for tracker purposes.
  const effectiveStatus = status === "CONFIRMED" ? "PENDING" : status;
  const currentIndex = STEPS.indexOf(effectiveStatus as any);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                done ? "bg-rose-gold text-white" : "bg-beige text-ink/30"
              }`}>
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span className={`text-[10px] capitalize ${done ? "text-ink font-medium" : "text-ink/35"}`}>{step.toLowerCase()}</span>
            </div>
            {!isLast && <div className={`h-0.5 flex-1 mx-1.5 -mt-4 ${i < currentIndex ? "bg-rose-gold" : "bg-beige"}`} />}
          </div>
        );
      })}
    </div>
  );
}
