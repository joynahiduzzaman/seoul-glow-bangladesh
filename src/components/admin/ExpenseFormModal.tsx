"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Info } from "lucide-react";
import toast from "react-hot-toast";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  expenseCategory,
} from "@/lib/expense-categories";

export interface EditingExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  spentAt: string | Date;
  vendor: string | null;
  reference: string | null;
  paidVia: string | null;
  note: string | null;
}

interface FormValues {
  title: string;
  category: string;
  amount: string;
  spentAt: string;
  vendor: string;
  reference: string;
  paidVia: string;
  note: string;
}

/** Local yyyy-mm-dd. `toISOString().slice(0,10)` would shift the date backwards
 *  for anyone west of UTC, defaulting the form to yesterday. */
function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateInputValue(value: string | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayInputValue();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const emptyForm = (): FormValues => ({
  title: "",
  // Courier bills are the most frequently recorded expense in a shop like this,
  // so the picker opens on the answer rather than on a prompt.
  category: "SHIPPING",
  amount: "",
  spentAt: todayInputValue(),
  vendor: "",
  reference: "",
  paidVia: "CASH",
  note: "",
});

const FIELD =
  "w-full rounded-lg border border-ink/10 bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-rose-gold/50 focus:outline-none focus:ring-2 focus:ring-rose-gold/15";

export default function ExpenseFormModal({
  editing,
  onClose,
}: {
  editing: EditingExpense | null | "new";
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [loading, setLoading] = useState(false);
  const isEdit = editing !== null && editing !== "new";

  useEffect(() => {
    if (editing && editing !== "new") {
      setForm({
        title: editing.title,
        category: editing.category,
        amount: String(editing.amount),
        spentAt: toDateInputValue(editing.spentAt),
        vendor: editing.vendor ?? "",
        reference: editing.reference ?? "",
        paidVia: editing.paidVia ?? "",
        note: editing.note ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [editing]);

  // Escape closes, matching every other dialog in the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (editing === null) return null;

  const selected = expenseCategory(form.category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        amount,
        spentAt: form.spentAt,
        vendor: form.vendor.trim() || null,
        reference: form.reference.trim() || null,
        paidVia: form.paidVia || null,
        note: form.note.trim() || null,
      };

      const res = await fetch(
        isEdit ? `/api/admin/expenses/${(editing as EditingExpense).id}` : "/api/admin/expenses",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      toast.success(isEdit ? "Expense updated" : "Expense recorded");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit expense" : "Record an expense"}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl2 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {isEdit ? "Edit expense" : "Record an expense"}
            </h3>
            <p className="mt-0.5 text-xs text-ink/60">
              Anything the shop paid for that isn&apos;t the wholesale cost of a sold item.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="exp-title" className="mb-1.5 block text-xs font-medium text-ink/70">
              What was it for
            </label>
            <input
              id="exp-title"
              required
              autoFocus
              placeholder="e.g. Steadfast courier bill — September"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={FIELD}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-amount" className="mb-1.5 block text-xs font-medium text-ink/70">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40">
                  ৳
                </span>
                <input
                  id="exp-amount"
                  required
                  type="number"
                  min={1}
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={`${FIELD} pl-7 tabular-nums`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="exp-date" className="mb-1.5 block text-xs font-medium text-ink/70">
                Date spent
              </label>
              <input
                id="exp-date"
                required
                type="date"
                value={form.spentAt}
                onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-category" className="mb-1.5 block text-xs font-medium text-ink/70">
              Category
            </label>
            <select
              id="exp-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={FIELD}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-ink/55">
                <Info size={13} className="mt-0.5 shrink-0" />
                {selected.hint}
              </p>
            )}
          </div>

          {/* Shown only for the one category that behaves differently, and worded
              as what it means for the owner's numbers rather than as accounting
              terminology. Without it, "I added my ৳50,000 stock purchase and my
              profit didn't move" reads as a bug. */}
          {selected && !selected.operating && (
            <div className="rounded-lg border border-badge-coupon/25 bg-badge-coupon/[0.06] p-3 text-xs leading-relaxed text-ink/75">
              <strong className="font-semibold">This won&apos;t reduce your profit figure.</strong> Buying
              stock moves cash into inventory — it becomes a cost only when each item sells, and that is
              already counted automatically from the product&apos;s cost price. It is tracked here as cash
              out so you can still see it.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-vendor" className="mb-1.5 block text-xs font-medium text-ink/70">
                Paid to <span className="font-normal text-ink/40">(optional)</span>
              </label>
              <input
                id="exp-vendor"
                placeholder="e.g. Steadfast"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="exp-paidvia" className="mb-1.5 block text-xs font-medium text-ink/70">
                Paid with <span className="font-normal text-ink/40">(optional)</span>
              </label>
              <select
                id="exp-paidvia"
                value={form.paidVia}
                onChange={(e) => setForm({ ...form, paidVia: e.target.value })}
                className={FIELD}
              >
                <option value="">Not recorded</option>
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="exp-ref" className="mb-1.5 block text-xs font-medium text-ink/70">
              Receipt or transaction no. <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <input
              id="exp-ref"
              placeholder="e.g. bKash TrxID"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="exp-note" className="mb-1.5 block text-xs font-medium text-ink/70">
              Note <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <textarea
              id="exp-note"
              rows={2}
              placeholder="Anything worth remembering about this one"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={`${FIELD} resize-y`}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-ink/10 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/[0.03]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white shadow-e1 transition-all hover:bg-[#B27878] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : isEdit ? "Save changes" : "Record expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
