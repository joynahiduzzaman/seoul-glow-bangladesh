"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft } from "lucide-react";

interface Reply {
  id: string;
  message: string;
  isFromStaff: boolean;
  authorName: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  orderNumber: string | null;
  replies: Reply[];
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-pastel-green/50 text-ink",
  CLOSED: "bg-beige text-ink/70",
};

export default function SupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    fetch(`/api/account/support-tickets/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setTicket(d.ticket))
      .catch(() => setNotFound(true));
  }

  useEffect(load, [params.id]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/account/support-tickets/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="text-sm text-ink/70 mb-4">Ticket not found.</p>
        <Link href="/account/support" className="text-rose-gold-text underline text-sm">Back to tickets</Link>
      </div>
    );
  }

  if (!ticket) {
    return <div className="animate-pulse h-40 bg-beige rounded-xl2" />;
  }

  const isClosed = ticket.status === "CLOSED";

  return (
    <div>
      <Link href="/account/support" className="inline-flex items-center gap-1 text-sm text-rose-gold-text hover:underline mb-4">
        <ChevronLeft size={15} /> Back to tickets
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl">{ticket.subject}</h2>
        <span className={`text-xs rounded-full px-3 py-1 font-medium shrink-0 ${STATUS_STYLES[ticket.status] || "bg-beige"}`}>{ticket.status.replace("_", " ")}</span>
      </div>
      {ticket.orderNumber && <p className="text-xs text-ink/70 mb-6">Regarding order {ticket.orderNumber}</p>}

      <div className="space-y-4 mb-6">
        {ticket.replies.map((r) => (
          <div key={r.id} className={`card-surface p-5 ${r.isFromStaff ? "bg-beige/50" : ""}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium">{r.authorName}</span>
              {r.isFromStaff && <span className="text-[10px] bg-rose-gold/15 text-rose-gold-text rounded-full px-2 py-0.5">Seoul Glow Support</span>}
              <span className="text-xs text-ink/35">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-ink/70 leading-relaxed">{r.message}</p>
          </div>
        ))}
      </div>

      {isClosed ? (
        <p className="text-sm text-ink/70 text-center py-4">This ticket is closed. Open a new ticket if you need further help.</p>
      ) : (
        <form onSubmit={handleReply} className="flex gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your reply…"
            className="flex-1 rounded-full border border-ink/10 px-5 py-3 text-sm"
          />
          <button disabled={sending || !message.trim()} className="btn-primary shrink-0">{sending ? "Sending…" : "Send"}</button>
        </form>
      )}
    </div>
  );
}
