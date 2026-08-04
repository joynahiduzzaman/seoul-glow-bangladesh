"use client";

import { useEffect, useState } from "react";
import { formatBDT } from "@/lib/utils";
import toast from "react-hot-toast";
import { Copy, Users, Wallet } from "lucide-react";

interface ReferralData {
  referralCode: string;
  referredUsers: { name: string; createdAt: string }[];
  commissions: { id: string; orderNumber: string; amount: number; status: string; createdAt: string }[];
  totalEarned: number;
  totalPending: number;
  commissionPercent: number;
}

export default function ReferralDashboard({ referralCode }: { referralCode: string }) {
  const [data, setData] = useState<ReferralData | null>(null);
  // Computed only after mount (not during the initial render) so the server-rendered
  // HTML and the client's first render match exactly — reading window.location directly
  // in the render body would differ between server ("") and client (real origin),
  // which triggers a hydration mismatch and can leave the page non-interactive.
  const [siteUrl, setSiteUrl] = useState("");
  const referralLink = siteUrl ? `${siteUrl}/?ref=${referralCode}` : "";

  useEffect(() => {
    setSiteUrl(window.location.origin);
  }, []);

  useEffect(() => {
    fetch("/api/account/referrals")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl2 shadow-soft p-6">
        <h2 className="font-display text-2xl mb-2">Your Referral Link</h2>
        <p className="text-sm text-ink/70 mb-4">
          Share this link with friends. When they sign up and place an order, you earn {data?.commissionPercent ?? 10}% commission — automatically tracked.
        </p>
        <div className="flex gap-2">
          <input readOnly value={referralLink} className="flex-1 rounded-full px-4 py-2.5 text-sm border border-ink/10 bg-beige/40" />
          <button onClick={copyLink} className="btn-outline !py-2 flex items-center gap-2"><Copy size={14} /> Copy</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl2 shadow-soft p-5">
          <div className="flex items-center gap-2 text-ink/70 text-xs uppercase tracking-wide mb-1"><Users size={14} /> Referred Friends</div>
          <p className="font-display text-2xl font-semibold">{data?.referredUsers.length ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl2 shadow-soft p-5">
          <div className="flex items-center gap-2 text-ink/70 text-xs uppercase tracking-wide mb-1"><Wallet size={14} /> Total Earned</div>
          <p className="font-display text-2xl font-semibold">{data ? formatBDT(data.totalEarned) : "—"}</p>
        </div>
        <div className="bg-white rounded-xl2 shadow-soft p-5">
          <div className="flex items-center gap-2 text-ink/70 text-xs uppercase tracking-wide mb-1"><Wallet size={14} /> Pending Payout</div>
          <p className="font-display text-2xl font-semibold">{data ? formatBDT(data.totalPending) : "—"}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl2 shadow-soft p-6">
        <h3 className="font-display text-lg mb-4">Commission History</h3>
        {data && data.commissions.length > 0 ? (
          <div className="space-y-2">
            {data.commissions.map((c) => (
              <div key={c.id} className="flex justify-between text-sm border-b border-ink/5 pb-2">
                <span>Order {c.orderNumber}</span>
                <span className={c.status === "PAID" ? "text-pastel-green" : "text-amber-600"}>{c.status}</span>
                <span className="font-medium">{formatBDT(c.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/70">No commissions yet — share your link to start earning.</p>
        )}
      </div>
    </div>
  );
}
