// DISABLED — Affiliate Program is temporarily off. This is the original public
// landing page, preserved exactly as it was so it can be restored later.
//
// To re-enable: copy this file's content back into
// src/app/affiliate/page.tsx, restore the Footer link in src/components/Footer.tsx
// (see the comment left there), and restore the FAQ entry in src/lib/faq-data.ts.
//
// Next.js ignores any folder prefixed with "_" for routing, so this file is
// not reachable at any URL — it's an inert backup only.

import Link from "next/link";
import { Share2, Percent, Wallet, Users, Link2, ShoppingBag, Banknote, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import FaqAccordion from "@/components/FaqAccordion";
import { getCurrentUser } from "@/server/auth";

export const metadata = { title: "Affiliate Program" };

const commissionPercent = Number(process.env.AFFILIATE_COMMISSION_PERCENT || 10);

const BENEFITS = [
  { icon: Percent, title: `${commissionPercent}% Commission`, body: "On every order your referrals place — not just their first purchase." },
  { icon: Users, title: "No Referral Cap", body: "Invite as many people as you want. There's no limit on how much you can earn." },
  { icon: Link2, title: "Automatic Tracking", body: "Your unique link does the work — every signup and order is tracked for you, no spreadsheets needed." },
  { icon: Wallet, title: "Simple Payouts", body: "Track everything you've earned right from your dashboard, all in one place." },
];

const STEPS = [
  { icon: Share2, title: "Share Your Link", body: "Get your unique referral link from your dashboard and share it anywhere — social media, group chats, or your own blog." },
  { icon: ShoppingBag, title: "Your Friend Shops", body: `They sign up using your link and place an order — any order, any time.` },
  { icon: Banknote, title: `You Earn ${commissionPercent}%`, body: "Commission is calculated automatically and added to your dashboard the moment their order is confirmed." },
];

const FAQS = [
  { q: "How much can I earn?", a: `You earn ${commissionPercent}% of the order total on every purchase your referrals make — for as long as they keep shopping with us, not just their first order.` },
  { q: "Is there a limit to how many people I can refer?", a: "No limit at all. Share your link as widely as you'd like." },
  { q: "How do I get paid?", a: "Your earnings are tracked automatically in your dashboard. Reach out via our Contact page to arrange payout once you're ready to cash out." },
  { q: "Does it cost anything to join?", a: "Nothing — the affiliate program is free to join for any registered customer." },
];

export default async function AffiliatePage() {
  const user = await getCurrentUser();

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-cream section-py">
        <div className="container-px mx-auto text-center max-w-xl">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.25em] text-rose-gold-light font-semibold mb-5">Affiliate Program</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight mb-5">
              Share the glow. <span className="text-rose-gold-light italic">Earn</span> while you do.
            </h1>
            <p className="text-cream/60 text-sm mb-9 max-w-md mx-auto">
              Earn {commissionPercent}% commission every time someone you refer shops with us — automatically tracked, no limits.
            </p>
            <Link
              href={user ? "/account/referrals" : "/register?redirect=/account/referrals"}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-rose-gold px-8 text-sm font-medium text-white shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {user ? "Go to Your Dashboard" : "Join Now — It's Free"} <ArrowRight size={15} />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold mb-4">Why Join</p>
          <h2 className="section-title">Built to actually pay off.</h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {BENEFITS.map(({ icon: Icon, title, body }, i) => (
            <ScrollReveal key={title} delay={i * 0.08}>
              <div className="card-surface p-6 h-full">
                <div className="h-11 w-11 rounded-full bg-rose-gold/10 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-rose-gold" />
                </div>
                <h3 className="font-medium text-sm mb-2">{title}</h3>
                <p className="text-xs text-body leading-relaxed">{body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Commission example */}
      <section className="bg-beige/60 section-py">
        <div className="container-px mx-auto">
          <ScrollReveal className="rounded-2xl bg-white p-10 md:p-14 max-w-2xl mx-auto text-center shadow-glass">
            <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold mb-4">See It In Numbers</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-8">A simple example</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
              <div>
                <p className="text-xs text-body mb-1">Your friend orders</p>
                <p className="font-display text-3xl font-semibold text-ink">৳3,000</p>
              </div>
              <span className="text-2xl text-ink/20 font-display">×</span>
              <div>
                <p className="text-xs text-body mb-1">Your commission</p>
                <p className="font-display text-3xl font-semibold text-ink">{commissionPercent}%</p>
              </div>
              <span className="text-2xl text-ink/20 font-display">=</span>
              <div>
                <p className="text-xs text-body mb-1">You earn</p>
                <p className="font-display text-3xl font-semibold text-rose-gold">৳{Math.round(3000 * (commissionPercent / 100))}</p>
              </div>
            </div>
            <p className="text-xs text-body mt-8">Illustrative example — commission is calculated the same way on every order, automatically.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* How it works */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold mb-4">How It Works</p>
          <h2 className="section-title">Three steps to start earning.</h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <ScrollReveal key={title} delay={i * 0.1}>
              <div className="card-surface p-8 h-full">
                <div className="h-10 w-10 rounded-full bg-white ring-1 ring-border-soft shadow-soft flex items-center justify-center text-rose-gold font-display font-semibold mb-5">
                  {i + 1}
                </div>
                <Icon size={20} className="text-rose-gold mb-3" />
                <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-body leading-relaxed">{body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="bg-ink text-cream section-py">
        <div className="container-px mx-auto grid md:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-light font-semibold mb-4">Your Dashboard</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">Everything tracked in one place.</h2>
            <p className="text-cream/60 text-sm leading-relaxed max-w-sm">
              Your referral link, total referrals, and every commission you've earned — all visible the moment you log in. No spreadsheets, no guessing.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            {/* Illustrative mockup, not real account data */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-[10px] text-cream/40 uppercase tracking-wide mb-1">Referrals</p>
                  <p className="font-display text-xl font-semibold">18</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-[10px] text-cream/40 uppercase tracking-wide mb-1">Total Earned</p>
                  <p className="font-display text-xl font-semibold">৳4,250</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-[10px] text-cream/40 uppercase tracking-wide mb-1">This Month</p>
                  <p className="font-display text-xl font-semibold text-rose-gold-light">৳820</p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-xs">
                    <span className="text-cream/60">Order #SGB{250700 + i}</span>
                    <span className="text-success font-medium">+৳{120 + i * 30}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-px mx-auto section-py max-w-2xl">
        <ScrollReveal className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-semibold mb-4">Questions</p>
          <h2 className="section-title">Common Questions</h2>
        </ScrollReveal>
        <ScrollReveal>
          <FaqAccordion items={FAQS} />
        </ScrollReveal>
      </section>

      {/* Final CTA */}
      <section className="container-px mx-auto pb-24">
        <ScrollReveal className="rounded-2xl bg-rose-gold text-white text-center p-14 md:p-20">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">Ready to start earning?</h2>
          <p className="text-white/80 max-w-md mx-auto mb-8">It takes less than a minute to get your referral link.</p>
          <Link
            href={user ? "/account/referrals" : "/register?redirect=/account/referrals"}
            className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-white text-rose-gold px-8 text-sm font-medium shadow-lg hover:-translate-y-0.5 transition-all"
          >
            {user ? "Go to Your Dashboard" : "Join the Program"} <ArrowRight size={15} />
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
