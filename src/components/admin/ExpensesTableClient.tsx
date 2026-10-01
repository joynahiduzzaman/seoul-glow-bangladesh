"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus, Receipt } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import {
  expenseCategoryLabel,
  expensePaymentLabel,
  isOperatingCategory,
} from "@/lib/expense-categories";
import ExpenseFormModal, { type EditingExpense } from "./ExpenseFormModal";
import ConfirmDialog from "./ConfirmDialog";

export interface ExpenseRow {
  id: string;
  title: string;
  category: string;
  amount: number;
  spentAt: string;
  vendor: string | null;
  reference: string | null;
  paidVia: string | null;
  note: string | null;
  recordedByName: string | null;
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpensesTableClient({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingExpense | null | "new">(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/expenses/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete that expense");
      toast.success("Expense deleted");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that expense");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </h2>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white shadow-e1 transition-all hover:bg-[#B27878] hover:shadow-e3"
        >
          <Plus size={16} />
          Record expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl2 border border-border-soft bg-white p-12 text-center shadow-soft">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
            <Receipt size={22} />
          </span>
          <h3 className="font-display text-lg">Nothing recorded for this period</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            Add courier bills, ad spend, packaging, salaries — anything the shop paid for. Each one is
            subtracted from your profit so the figure on the dashboard is the real one.
          </p>
          <button
            onClick={() => setEditing("new")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B27878]"
          >
            <Plus size={16} />
            Record the first one
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-cream/50 text-left text-[11px] uppercase tracking-[0.12em] text-ink/60">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Expense</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Paid with</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const operating = isOperatingCategory(e.category);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border-soft/60 transition-colors last:border-0 hover:bg-cream/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-ink/70">{formatDay(e.spentAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{e.title}</p>
                        {(e.vendor || e.reference || e.note) && (
                          <p className="mt-0.5 truncate text-xs text-ink/55">
                            {[e.vendor, e.reference, e.note].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            operating
                              ? "bg-rose-gold/10 text-rose-gold-text"
                              : "bg-badge-coupon/10 text-badge-coupon"
                          }`}
                        >
                          {expenseCategoryLabel(e.category)}
                        </span>
                        {!operating && (
                          <span className="mt-1 block text-[10px] text-ink/45">Not in profit</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink/60">
                        {expensePaymentLabel(e.paidVia) ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {formatBDT(e.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                id: e.id,
                                title: e.title,
                                category: e.category,
                                amount: e.amount,
                                spentAt: e.spentAt,
                                vendor: e.vendor,
                                reference: e.reference,
                                paidVia: e.paidVia,
                                note: e.note,
                              })
                            }
                            aria-label={`Edit ${e.title}`}
                            className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleting(e)}
                            aria-label={`Delete ${e.title}`}
                            className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-badge-sale/10 hover:text-badge-sale"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseFormModal editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this expense?"
        message={
          deleting
            ? `"${deleting.title}" (${formatBDT(deleting.amount)}) will be removed, and your profit for that period will go back up by this amount. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
