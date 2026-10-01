"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, X } from "lucide-react";
import toast from "react-hot-toast";

export default function StockAdjustButton({
  productId,
  productName,
  canRecordCost = false,
}: {
  productId: string;
  productName: string;
  /** ADMIN/MANAGER only — the expenses API refuses STAFF, so the field is not
   *  offered to someone whose submission would be rejected. */
  canRecordCost?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(amount);
    if (!qty || qty <= 0) return toast.error("Enter a quantity greater than 0");
    if (!reason.trim()) return toast.error("A reason is required for the stock history log");

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          change: qty * direction,
          reason: reason.trim(),
          // Only sent when adding stock and the field was filled in.
          purchaseCost: direction === 1 && cost.trim() ? Number(cost) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.warning) toast.error(data.warning);
      else if (data.expenseRecorded) toast.success(`Stock updated to ${data.stock}, cost recorded`);
      else toast.success(`Stock updated to ${data.stock}`);
      setOpen(false);
      setAmount("1");
      setReason("");
      setCost("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs rounded-lg border border-ink/10 px-3 py-1.5 hover:border-rose-gold hover:text-rose-gold-text transition-colors">
        Adjust
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Adjust Stock</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={18} /></button>
            </div>
            <p className="text-xs text-ink/70 mb-4 truncate">{productName}</p>

            <div className="flex rounded-lg border border-ink/10 p-1 mb-3">
              <button
                type="button"
                onClick={() => setDirection(1)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${direction === 1 ? "bg-success/10 text-success" : "text-ink/70"}`}
              >
                <Plus size={14} /> Add
              </button>
              <button
                type="button"
                onClick={() => setDirection(-1)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${direction === -1 ? "bg-badge-sale/10 text-badge-sale" : "text-ink/70"}`}
              >
                <Minus size={14} /> Remove
              </button>
            </div>

            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm mb-3"
              placeholder="Quantity"
            />
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (e.g. Restocked from supplier, Damaged units)"
              className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm mb-4"
            />

            {/* Buying stock and writing down what it cost were two separate
                screens, so the second step was easy to skip — and a skipped
                purchase is money missing from the books. Asking here, at the
                moment the stock arrives, is the only time the number is to hand. */}
            {canRecordCost && direction === 1 && (
              <div className="mb-4">
                <label htmlFor="restock-cost" className="mb-1.5 block text-xs font-medium text-ink/70">
                  What did this stock cost? <span className="font-normal text-ink/40">(optional)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40">৳</span>
                  <input
                    id="restock-cost"
                    type="number"
                    min={1}
                    step="any"
                    inputMode="decimal"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-ink/10 py-2.5 pl-7 pr-4 text-sm tabular-nums"
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/55">
                  Saved as a Stock purchase on the Expenses page. It won&apos;t reduce your profit — each
                  item&apos;s cost already counts as it sells.
                </p>
              </div>
            )}

            <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : "Save Adjustment"}</button>
          </form>
        </div>
      )}
    </>
  );
}
