import { ShieldCheck, Globe2, Truck, RotateCcw } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "100% Authentic", body: "Batch-verified" },
  { icon: Globe2, title: "Imported from Korea", body: "Direct from Seoul" },
  { icon: Truck, title: "Fast Delivery", body: "Dhaka in 1–3 days" },
  { icon: RotateCcw, title: "Easy Returns", body: "7-day window" },
];

export default function ProductTrustRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border-soft">
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <div key={title} className="rounded-xl border border-border-soft bg-white p-3.5 flex flex-col items-center text-center gap-1.5">
          <Icon size={17} className="text-rose-gold" />
          <span className="text-[11px] font-medium text-ink leading-tight">{title}</span>
          <span className="text-[10px] text-body leading-tight">{body}</span>
        </div>
      ))}
    </div>
  );
}
