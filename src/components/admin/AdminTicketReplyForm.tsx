"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminTicketReplyForm({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || undefined, status: status !== currentStatus ? status : undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Updated");
      setMessage("");
      router.refresh();
    } catch {
      toast.error("Failed to update ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-soft p-5 space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Reply to the customer…"
        rows={3}
        className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm"
      />
      <div className="flex items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-full border border-ink/10 px-3 py-2">
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <button disabled={loading || (!message && status === currentStatus)} className="btn-primary !py-2 !text-xs flex-1">
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
