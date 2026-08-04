// DISABLED — Referral Program is temporarily off. This is the original page,
// preserved exactly as it was so it can be restored later.
//
// To re-enable: copy this file's content back into
// src/app/account/referrals/page.tsx, and restore the sidebar link in
// src/app/account/layout.tsx (see the comment left there).
//
// Next.js ignores any folder prefixed with "_" for routing, so this file is
// not reachable at any URL — it's an inert backup only.

import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import ReferralDashboard from "@/components/ReferralDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referral Program" };

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ReferralDashboard referralCode={user.referralCode} />;
}
