interface FaqItem {
  q: string;
  a: string;
}

/**
 * Pure CSS chevron rotation via the `details[open]` selector — no client JS needed,
 * so this works even if hydration is slow or fails. Reused across About, FAQ, and
 * the other info pages being redesigned in this phase.
 */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-border-soft rounded-xl2 border border-border-soft bg-white overflow-hidden">
      {items.map((item) => (
        <details key={item.q} className="group px-6 py-5">
          <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-sm text-ink">
            {item.q}
            <span className="shrink-0 text-ink/70 transition-transform duration-300 group-open:rotate-45 text-xl leading-none">+</span>
          </summary>
          <p className="text-sm text-ink/70 leading-relaxed mt-3">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
