"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ChevronRight, Loader2 } from "lucide-react";

const NEXT_LABEL: Record<string, string> = {
  PENDING: "Confirm",
  CONFIRMED: "Pack",
  PACKED: "Ship",
  SHIPPED: "Delivered",
};

/**
 * One-click advance on the row itself.
 *
 * Fulfilment is a repetitive job — confirm, pack, ship, delivered, over and
 * over — and doing it through the drawer's status dropdown is four clicks per
 * order. This is the same transition through the same endpoint, just reachable
 * in one.
 *
 * Nothing is shown for a status with no forward step, so there is no button to
 * press on a delivered or cancelled order.
 */
export default function OrderQuickAdvance({
  orderId,
  status,
  onDone,
}: {
  orderId: string;
  status: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const label = NEXT_LABEL[status];
  if (!label) return null;

  async function advance(e: React.MouseEvent) {
    // The row opens the drawer; advancing must not also do that.
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [orderId], action: "nextStatus" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not advance this order");
      if (data.count === 0) {
        throw new Error(data.details?.[0]?.reason || "This order can't move forward");
      }
      toast.success(`Order moved to ${label === "Delivered" ? "delivered" : label.toLowerCase() + "ed"}`);
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Could not advance this order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={advance}
      disabled={busy}
      title={`Move this order to ${label}`}
      className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/70 transition-colors hover:border-rose-gold hover:text-rose-gold-text disabled:opacity-40"
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
      {label}
    </button>
  );
}
