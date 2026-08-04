import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import MarkPaidButton from "@/components/admin/MarkPaidButton";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  const commissions = await prisma.commission.findMany({
    include: { referrer: { select: { name: true, email: true, referralCode: true } } },
    orderBy: { createdAt: "desc" },
  });

  const topReferrers = await prisma.user.findMany({
    where: { referrals: { some: {} } },
    select: { name: true, referralCode: true, _count: { select: { referrals: true } } },
    orderBy: { referrals: { _count: "desc" } },
    take: 5,
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">Affiliate Program</h1>

      <div className="bg-white rounded-xl2 shadow-soft p-6 mb-8">
        <h2 className="font-display text-lg mb-4">Top Referrers</h2>
        {topReferrers.length === 0 ? (
          <p className="text-sm text-ink/70">No referrals yet.</p>
        ) : (
          <div className="space-y-2">
            {topReferrers.map((r) => (
              <div key={r.referralCode} className="flex justify-between text-sm border-b border-ink/5 pb-2">
                <span>{r.name} ({r.referralCode})</span>
                <span className="font-medium">{r._count.referrals} referrals</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl2 shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/70 border-b border-ink/10">
              <th className="p-4">Referrer</th>
              <th className="p-4">Order</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id} className="border-b border-ink/5">
                <td className="p-4">{c.referrer.name}<br /><span className="text-xs text-ink/70">{c.referrer.email}</span></td>
                <td className="p-4">{c.orderNumber}</td>
                <td className="p-4">{formatBDT(c.amount)}</td>
                <td className="p-4">
                  <span className={`text-xs rounded-full px-2 py-1 ${c.status === "PAID" ? "bg-pastel-green/40" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                </td>
                <td className="p-4">{c.status === "PENDING" && <MarkPaidButton commissionId={c.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && <p className="p-8 text-center text-ink/70">No commissions yet.</p>}
      </div>
    </div>
  );
}
