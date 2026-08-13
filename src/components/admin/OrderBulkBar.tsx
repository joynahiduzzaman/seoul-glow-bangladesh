"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ChevronRight, Truck, Printer, X, Loader2, RefreshCw } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { ORDER_STATUSES } from "@/lib/order-status";
import { COURIERS, COURIER_LABELS } from "@/lib/shipping";

type Pending =
  | { kind: "changeStatus"; status: string }
  | { kind: "nextStatus" }
  | { kind: "assignCourier"; courier: string; customCourierName?: string }
  | null;

/**
 * The bar that appears once orders are ticked.
 *
 * Every action that writes goes through a confirmation naming the number of
 * orders and what will happen to them — a bulk status change moves stock and
 * emails customers, and there is no undo.
 */
export default function OrderBulkBar({
  selectedIds,
  onClear,
  onDone,
}: {
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState("");
  const [courier, setCourier] = useState("");
  const [customCourier, setCustomCourier] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const count = selectedIds.length;
  if (count === 0) return null;

  async function run(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk action failed");

      if (data.count > 0 && data.skipped === 0) {
        toast.success(`${data.count} order${data.count === 1 ? "" : "s"} updated`);
      } else if (data.count > 0) {
        toast.success(`${data.count} updated · ${data.skipped} skipped`);
      } else {
        toast.error(`Nothing changed — all ${data.skipped} were skipped`);
      }
      // The per-order reasons matter more than the count: "3 skipped" without
      // saying which, or why, leaves the admin to go hunting.
      for (const d of (data.details || []).slice(0, 4)) {
        toast(`${d.orderNumber}: ${d.reason}`, { icon: "⚠️", duration: 6000 });
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function print(type: string) {
    // A new tab, so the admin keeps their filtered list and selection.
    window.open(`/admin-print/orders/batch?type=${type}&ids=${selectedIds.join(",")}`, "_blank", "noopener");
  }

  const orders = `${count} order${count === 1 ? "" : "s"}`;
  const confirmCopy: Record<string, { title: string; message: string; label: string }> = {
    changeStatus: {
      title: `Move ${orders} to ${pending && "status" in pending ? pending.status.toLowerCase() : ""}?`,
      message:
        "Orders that can't make that move are skipped and listed. Cancelling or returning an order restores its stock, and the customer is notified of the change.",
      label: "Change status",
    },
    nextStatus: {
      title: `Advance ${orders} one step?`,
      message:
        "Each order moves to its own next status — pending to confirmed, confirmed to packed, and so on. Anything with no next step is skipped. Customers are notified.",
      label: "Move to next status",
    },
    assignCourier: {
      title: `Assign a courier to ${orders}?`,
      message:
        "This sets the courier on each order. Cancelled, returned and draft orders are skipped. Tracking numbers aren't fetched in bulk — open an order to pull one.",
      label: "Assign courier",
    },
  };
  const copy = pending ? confirmCopy[pending.kind] : null;

  return (
    <>
      <div className="sticky top-2 z-20 mb-4 rounded-xl2 border border-rose-gold/25 bg-white p-3 shadow-e2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-2 rounded-full bg-rose-gold/10 px-3 py-1.5 text-xs font-semibold text-rose-gold-text">
            {count} selected
          </span>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Bulk status"
            className="rounded-lg border border-ink/10 px-3 py-2 text-xs"
          >
            <option value="">Change status…</option>
            {ORDER_STATUSES.filter((s) => s !== "DRAFT").map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!status || busy}
            onClick={() => setPending({ kind: "changeStatus", status })}
            className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-30"
          >
            Apply
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setPending({ kind: "nextStatus" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60 disabled:opacity-40"
          >
            <ChevronRight size={13} /> Move to next status
          </button>

          <span className="mx-1 h-5 w-px bg-ink/10" />

          <select
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            aria-label="Bulk courier"
            className="rounded-lg border border-ink/10 px-3 py-2 text-xs"
          >
            <option value="">Assign courier…</option>
            {COURIERS.map((c) => (
              <option key={c} value={c}>{COURIER_LABELS[c]}</option>
            ))}
          </select>
          {courier === "CUSTOM" && (
            <input
              value={customCourier}
              onChange={(e) => setCustomCourier(e.target.value)}
              placeholder="Courier name"
              aria-label="Custom courier name"
              className="w-36 rounded-lg border border-ink/10 px-3 py-2 text-xs"
            />
          )}
          <button
            type="button"
            disabled={!courier || busy || (courier === "CUSTOM" && !customCourier.trim())}
            onClick={() => setPending({ kind: "assignCourier", courier, customCourierName: customCourier })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-30"
          >
            <Truck size={13} /> Assign
          </button>

          <span className="mx-1 h-5 w-px bg-ink/10" />

          {/* Printing reads nothing and writes nothing, so it needs no
              confirmation — it just opens the documents in a new tab. */}
          {[
            { type: "invoice", label: "Invoices" },
            { type: "packing-slip", label: "Packing Slips" },
            { type: "shipping-label", label: "Labels" },
          ].map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => print(p.type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 px-3 py-2 text-xs font-medium hover:bg-beige/60"
            >
              <Printer size={13} /> {p.label}
            </button>
          ))}

          <button
            type="button"
            onClick={onClear}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink/60 hover:text-ink"
          >
            <X size={13} /> Clear
          </button>
        </div>
        {busy && (
          <p className="mt-2 flex items-center gap-2 text-[11px] text-ink/60">
            <Loader2 size={12} className="animate-spin" /> Working through {orders} one at a time…
          </p>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={copy?.title || ""}
        message={copy?.message || ""}
        confirmLabel={copy?.label || "Confirm"}
        danger={false}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "changeStatus") run({ action: "changeStatus", status: pending.status });
          else if (pending.kind === "nextStatus") run({ action: "nextStatus" });
          else run({ action: "assignCourier", courier: pending.courier, customCourierName: pending.customCourierName });
        }}
      />
    </>
  );
}
