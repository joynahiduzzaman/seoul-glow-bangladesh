import { prisma } from "@/server/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-pastel-green/50 text-ink",
  CLOSED: "bg-beige text-ink/70",
};

export default async function AdminSupportTicketsPage() {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: { select: { name: true, email: true } }, replies: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">Support Tickets</h1>
      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4">Subject</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Order</th>
              <th className="p-4">Replies</th>
              <th className="p-4">Updated</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-ink/5 hover:bg-beige/30">
                <td className="p-4">
                  <Link href={`/admin/support-tickets/${t.id}`} className="font-medium hover:text-rose-gold">{t.subject}</Link>
                </td>
                <td className="p-4 text-ink/70">{t.user.name}<br /><span className="text-xs text-ink/70">{t.user.email}</span></td>
                <td className="p-4 text-ink/70">{t.orderNumber || "—"}</td>
                <td className="p-4 text-ink/70">{t.replies.length}</td>
                <td className="p-4 text-ink/70">{new Date(t.updatedAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`text-xs rounded-full px-2 py-1 ${STATUS_STYLES[t.status] || "bg-beige"}`}>{t.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <p className="p-8 text-center text-ink/70">No support tickets yet.</p>}
      </div>
    </div>
  );
}
