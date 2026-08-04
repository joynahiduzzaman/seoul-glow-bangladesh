import { PackageSearch } from "lucide-react";
import TrackOrderClient from "@/components/TrackOrderClient";

export const metadata = { title: "Track Your Order" };

export default function TrackOrderPage() {
  return (
    <div className="container-px mx-auto py-14 md:py-20 max-w-3xl">
      <div className="text-center mb-10 md:mb-12">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
          <PackageSearch size={26} />
        </div>
        <p className="eyebrow mb-2">Guest Order Lookup</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">Track Your Order</h1>
        <p className="text-ink/70 mt-3 max-w-md mx-auto">
          Enter your order number and the phone number used at checkout to see its current status — no account needed.
        </p>
      </div>
      <TrackOrderClient />
    </div>
  );
}
