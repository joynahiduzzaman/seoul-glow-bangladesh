import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AdminTicketReplyForm from "@/components/admin/AdminTicketReplyForm";

export const dynamic = "force-dynamic";

export default async function AdminSupportTicketDetailPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, email: true } }, replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/support-tickets" className="inline-flex items-center gap-1 text-sm text-rose-gold-text hover:underline mb-4">
        <ChevronLeft size={15} /> Back to tickets
      </Link>

      <h1 className="font-display text-2xl font-semibold mb-1">{ticket.subject}</h1>
      <p className="text-sm text-ink/70 mb-6">
        {ticket.user.name} ({ticket.user.email}) {ticket.orderNumber && `· Order ${ticket.orderNumber}`}
      </p>

      <div className="space-y-4 mb-6">
        {ticket.replies.map((r) => (
          <div key={r.id} className={`bg-white rounded-xl2 shadow-soft p-5 ${r.isFromStaff ? "bg-beige/40" : ""}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium">{r.authorName}</span>
              {r.isFromStaff && <span className="text-[10px] bg-rose-gold/15 text-rose-gold-text rounded-full px-2 py-0.5">Staff</span>}
              <span className="text-xs text-ink/35">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-ink/70 leading-relaxed">{r.message}</p>
          </div>
        ))}
      </div>

      <AdminTicketReplyForm ticketId={ticket.id} currentStatus={ticket.status} />
    </div>
  );
}
