"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import CouponFormModal from "./CouponFormModal";
import ConfirmDialog from "./ConfirmDialog";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | Date | null;
  active: boolean;
  createdAt: string | Date;
}

function statusOf(c: Coupon): "active" | "disabled" | "expired" {
  if (c.expiresAt && new Date(c.expiresAt) <= new Date()) return "expired";
  if (!c.active) return "disabled";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  disabled: "bg-beige text-ink/70",
  expired: "bg-badge-sale/10 text-badge-sale",
};

export default function CouponsTableClient({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(c: Coupon) {
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(c.active ? "Coupon disabled" : "Coupon enabled");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update coupon");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await fetch(`/api/admin/coupons/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Coupon deleted");
      setDeleting(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing("new")} className="btn-primary !h-10 !px-5 !text-xs flex items-center gap-1.5">
          <Plus size={14} /> New Coupon
        </button>
      </div>

      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Min Spend</th>
              <th className="p-4">Usage</th>
              <th className="p-4">Expiry</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const status = statusOf(c);
              return (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="p-4 font-medium">{c.code}</td>
                  <td className="p-4">{c.type === "PERCENT" ? `${c.value}%` : formatBDT(c.value)}</td>
                  <td className="p-4 text-ink/70">{c.minSpend > 0 ? formatBDT(c.minSpend) : "—"}</td>
                  <td className="p-4 text-ink/70">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="p-4 text-ink/70">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="p-4">
                    <span className={`text-xs rounded-full px-2.5 py-1 font-medium capitalize ${STATUS_STYLES[status]}`}>{status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setEditing(c)} aria-label="Edit coupon" className="text-ink/70 hover:text-rose-gold">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={status === "expired" || busyId === c.id}
                        aria-label={c.active ? "Disable coupon" : "Enable coupon"}
                        className="text-ink/70 hover:text-rose-gold disabled:opacity-30"
                        title={status === "expired" ? "Expired coupons can't be re-enabled — edit the expiry date instead" : undefined}
                      >
                        {c.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      </button>
                      <button onClick={() => setDeleting(c)} aria-label="Delete coupon" className="text-ink/70 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="p-10 text-center text-sm text-ink/70">No coupons match this view.</p>}
      </div>

      <CouponFormModal editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this coupon?"
        message={deleting ? `"${deleting.code}" will be permanently removed. This can't be undone.` : ""}
        confirmLabel="Delete"
        loading={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
