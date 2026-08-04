"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, LifeBuoy } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  orderNumber: string | null;
  updatedAt: string;
  replies: { id: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-pastel-green/50 text-ink",
  CLOSED: "bg-beige text-ink/70",
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", orderNumber: "" });
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/account/support-tickets")
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets))
      .catch(() => setTickets([]));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/account/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, orderNumber: form.orderNumber || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Support ticket submitted");
      setForm({ subject: "", message: "", orderNumber: "" });
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        {!formOpen && (
          <button onClick={() => setFormOpen(true)} className="btn-primary !py-2 !text-xs flex items-center gap-1.5">
            <Plus size={14} /> New Ticket
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="card-surface p-6 space-y-3 mb-6">
          <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          <input placeholder="Order number (optional)" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          <textarea required minLength={10} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          <div className="flex gap-3">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-outline">Cancel</button>
            <button disabled={loading} className="btn-primary flex-1">{loading ? "Submitting…" : "Submit Ticket"}</button>
          </div>
        </form>
      )}

      {tickets === null ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-beige rounded-xl2" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <LifeBuoy className="mx-auto text-ink/20 mb-3" size={32} />
          <p className="text-sm text-ink/70">No support tickets yet. Need help with something? Open a new ticket above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/account/support/${t.id}`} className="card-surface p-5 flex items-center justify-between gap-4 hover:ring-1 hover:ring-rose-gold/30 block">
              <div>
                <p className="text-sm font-medium">{t.subject}</p>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t.orderNumber && `Order ${t.orderNumber} · `}
                  {t.replies.length} repl{t.replies.length !== 1 ? "ies" : "y"} · Updated {new Date(t.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs rounded-full px-3 py-1 font-medium shrink-0 ${STATUS_STYLES[t.status] || "bg-beige"}`}>{t.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
