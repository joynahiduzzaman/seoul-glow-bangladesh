// Referral Program is temporarily disabled — see _disabled/original-page.tsx for
// the full dashboard this replaces, kept intact for a future re-enable.
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Referral Program" };

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ComingSoon
      icon={Gift}
      eyebrow="Coming Soon"
      title="Our Referral Program is on its way."
      body="We're putting the finishing touches on a way for you to share Seoul Glow with friends. Check back soon for more details."
      ctaLabel="Continue Shopping"
      ctaHref="/shop"
    />
  );
}
