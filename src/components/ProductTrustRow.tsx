import { ShieldCheck, Globe2, Truck, RotateCcw } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "100% Authentic", body: "Batch-verified" },
  { icon: Globe2, title: "Imported from Korea", body: "Direct from Seoul" },
  { icon: Truck, title: "Fast Delivery", body: "Dhaka in 1–3 days" },
  { icon: RotateCcw, title: "Easy Returns", body: "7-day window" },
];

/**
 * The shipping and authenticity promises.
 *
 * A full-width band below the product rather than a strip inside the buy
 * column: these four are the same on every product, so they are reassurance
 * once the case for this particular item has been made, not part of making it.
 * Sized accordingly — the type can breathe here where it could not in a
 * half-width column.
 */
export default function ProductTrustRow() {
  return (
    <section className="mt-14 md:mt-20">
      <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex flex-col items-center gap-2 rounded-xl2 border border-border-soft bg-white px-4 py-5 text-center shadow-e1 transition-shadow duration-300 hover:shadow-e2"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-gold/15 to-soft-pink/60 text-rose-gold-text"
            >
              <Icon size={19} strokeWidth={1.9} />
            </span>
            <span className="text-[13px] font-semibold leading-tight text-ink">{title}</span>
            <span className="text-xs leading-tight text-body">{body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
