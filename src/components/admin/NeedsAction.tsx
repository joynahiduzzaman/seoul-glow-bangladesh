import Link from "next/link";
import { PackageSearch, Wallet, Truck, PackageX, ArrowRight, CheckCircle2 } from "lucide-react";

export interface ActionItem {
  label: string;
  count: number;
  href: string;
  hint: string;
  icon: "fulfil" | "payment" | "courier" | "stock";
}

const ICONS = { fulfil: PackageSearch, payment: Wallet, courier: Truck, stock: PackageX };

/**
 * What needs doing right now, in one place.
 *
 * The dashboard already counted most of this, but spread across cards that
 * report a state rather than ask for a decision — "Packed: 4" is a number,
 * "4 orders waiting for a courier" is a job. Each row links to the filtered
 * list that contains exactly those orders, so it can be worked immediately.
 *
 * A row with nothing in it drops out entirely rather than showing a zero: a
 * queue of zeros trains you to skip the section.
 */
export default function NeedsAction({ items }: { items: ActionItem[] }) {
  const live = items.filter((i) => i.count > 0);

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Needs Action</h2>

      {live.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl2 border border-success/25 bg-success/[0.06] p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Nothing waiting</p>
            <p className="text-xs text-ink/60">Every order is moving and no product is out of stock.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {live.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl2 border border-border-soft bg-white p-4 shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-0.5 hover:border-rose-gold/40 hover:shadow-e2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-gold/10 text-rose-gold">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-semibold tabular-nums leading-none">{item.count}</span>
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink/60">{item.hint}</span>
                </span>
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-ink/20 transition-transform duration-300 ease-silk group-hover:translate-x-0.5 group-hover:text-rose-gold"
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
