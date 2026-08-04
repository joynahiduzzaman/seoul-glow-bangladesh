"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export interface CouponFormValues {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSpend: string;
  usageLimit: string; // empty string = unlimited
  expiresAt: string; // yyyy-mm-dd, empty = never
}

const EMPTY_FORM: CouponFormValues = { code: "", type: "PERCENT", value: "", minSpend: "0", usageLimit: "", expiresAt: "" };

function toDateInputValue(iso: string | Date | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

interface EditingCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  usageLimit: number | null;
  expiresAt: string | Date | null;
}

export default function CouponFormModal({ editing, onClose }: { editing: EditingCoupon | null | "new"; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<CouponFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const isEdit = editing !== null && editing !== "new";

  useEffect(() => {
    if (editing && editing !== "new") {
      setForm({
        code: editing.code,
        type: editing.type as "PERCENT" | "FIXED",
        value: String(editing.value),
        minSpend: String(editing.minSpend),
        usageLimit: editing.usageLimit ? String(editing.usageLimit) : "",
        expiresAt: toDateInputValue(editing.expiresAt),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing]);

  if (editing === null) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minSpend: Number(form.minSpend || 0),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        // End-of-day on the chosen date, in the site's local sense — stored as UTC ISO.
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      };

      const res = await fetch(isEdit ? `/api/admin/coupons/${(editing as EditingCoupon).id}` : "/api/admin/coupons", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Coupon updated" : "Coupon created");
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 shadow-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg">{isEdit ? "Edit Coupon" : "New Coupon"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <input
            required
            placeholder="CODE"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm uppercase"
          />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm">
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed amount (BDT)</option>
          </select>
          <input required type="number" min={0} placeholder={form.type === "PERCENT" ? "Value (e.g. 15 for 15%)" : "Value in BDT"} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          <input type="number" min={0} placeholder="Minimum spend (BDT)" value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />

          <div>
            <label className="block text-xs text-ink/70 mb-1.5">Usage limit (optional)</label>
            <input type="number" min={1} placeholder="Unlimited" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink/70 mb-1.5">Expiry date (optional)</label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          </div>
        </div>

        <button disabled={loading} className="btn-primary w-full mt-5">{loading ? "Saving…" : isEdit ? "Save Changes" : "Create Coupon"}</button>
      </form>
    </div>
  );
}
