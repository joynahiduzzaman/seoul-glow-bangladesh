import Link from "next/link";
import Image from "next/image";
import { Sparkles, FlaskConical, Heart, ShieldCheck, PackageSearch, PlaneTakeoff, Truck, ArrowRight, Award, Check } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import FaqAccordion from "@/components/FaqAccordion";
import { getPageContent, text, rows } from "@/server/content";

export const metadata = { title: "About Us" };

// Icons stay in code — they're part of the design, not the content. The admin
// edits the words; the nth card keeps the nth icon.
const WHY_ICONS = [FlaskConical, Sparkles, Heart];
const PROCESS_ICONS = [PackageSearch, ShieldCheck, PlaneTakeoff, Truck];

// Kept in code rather than made editable: these answer questions about how the
// business is run, and each already has a canonical version on the FAQ page.
const FAQS = [
  { q: "Is everything on Seoul Glow really authentic?", a: "Yes. We source directly from Korean brands and their authorized distributors, and every unit carries a batch number and authenticity code you can check." },
  { q: "Why should I trust an online-only skincare store?", a: "We publish our sourcing process, verification steps, and delivery timelines openly — see our full Authenticity Guarantee page for exactly how we check every shipment." },
  { q: "How do I pay for my order?", a: "Cash on Delivery is available nationwide today. bKash and Nagad are launching soon for customers who'd rather pay online." },
  { q: "What if a product doesn't suit my skin?", a: "Unopened products can be returned within 7 days of delivery. Full details are on our Refund Policy page." },
];

export default async function AboutPage() {
  const content = await getPageContent("about");
  const promises = rows(content, "promises");
  const whyItems = rows(content, "whyItems");
  const processSteps = rows(content, "processSteps");
  const stats = rows(content, "stats");

  return (
    <div>
      {/* Hero banner */}
      <section className="relative h-[62vh] min-h-[420px] flex items-end overflow-hidden">
        {text(content, "heroImage") && (
          <Image
            src={text(content, "heroImage")}
            alt={text(content, "heroTitle")}
            fill
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
        <div className="relative container-px mx-auto pb-16 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-gold-light font-semibold mb-4">{text(content, "heroEyebrow")}</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold max-w-2xl leading-[1.05]">
            {text(content, "heroTitle")}
          </h1>
        </div>
      </section>

      {/* Our Story */}
      <section className="container-px mx-auto section-py grid md:grid-cols-2 gap-14 items-center">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "storyEyebrow")}</p>
          <h2 className="section-title mb-5">{text(content, "storyTitle")}</h2>
          <div className="space-y-4 text-body leading-relaxed">
            {[text(content, "storyBody1"), text(content, "storyBody2"), text(content, "storyBody3")]
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>

          {promises.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-7">
              {promises.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink/75">
                  <Check size={15} className="text-rose-gold shrink-0 mt-0.5" /> {item.text}
                </li>
              ))}
            </ul>
          )}
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="relative aspect-[4/5] rounded-xl2 overflow-hidden shadow-glass">
            {text(content, "storyImage") && (
              <Image
                src={text(content, "storyImage")}
                alt={text(content, "storyTitle")}
                fill
                className="object-cover"
              />
            )}
          </div>
        </ScrollReveal>
      </section>

      {/* Why Korea */}
      {whyItems.length > 0 && (
        <section className="bg-beige/60 section-py">
          <div className="container-px mx-auto">
            <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "whyEyebrow")}</p>
              <h2 className="section-title">{text(content, "whyTitle")}</h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-3 gap-6">
              {whyItems.map((item, i) => {
                const Icon = WHY_ICONS[i % WHY_ICONS.length];
                return (
                  <ScrollReveal key={i} delay={i * 0.1}>
                    <div className="card-surface p-8 h-full">
                      <div className="h-11 w-11 rounded-full bg-rose-gold/10 flex items-center justify-center mb-5">
                        <Icon size={19} className="text-rose-gold" />
                      </div>
                      <h3 className="font-display text-lg font-semibold mb-2.5">{item.title}</h3>
                      <p className="text-sm text-body leading-relaxed">{item.body}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Mission */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="max-w-2xl mx-auto text-center">
          <Award size={26} className="text-rose-gold mx-auto mb-6" />
          <p className="font-display text-2xl md:text-3xl leading-snug text-ink">
            &ldquo;{text(content, "missionQuote")}&rdquo;
          </p>
          <p className="text-sm text-body mt-6">{text(content, "missionAttribution")}</p>
        </ScrollReveal>
      </section>

      {/* Our Process */}
      {processSteps.length > 0 && (
        <section className="bg-beige/60 section-py">
          <div className="container-px mx-auto">
            <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "processEyebrow")}</p>
              <h2 className="section-title">{text(content, "processTitle")}</h2>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {processSteps.map((step, i) => {
                const Icon = PROCESS_ICONS[i % PROCESS_ICONS.length];
                return (
                  <ScrollReveal key={i} delay={i * 0.1} className="relative">
                    <div className="card-surface p-6 h-full">
                      <div className="h-10 w-10 rounded-full bg-white ring-1 ring-border-soft shadow-soft flex items-center justify-center text-rose-gold font-display font-semibold mb-4">
                        {i + 1}
                      </div>
                      <Icon size={20} className="text-rose-gold mb-3" />
                      <h3 className="font-medium text-sm mb-2">{step.title}</h3>
                      <p className="text-xs text-body leading-relaxed">{step.body}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Authenticity Promise */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="rounded-xl2 bg-ink text-cream p-10 md:p-14 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-light font-semibold mb-4">Authenticity Promise</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">
              Every product carries a batch number and authenticity code — verifiable, not just promised.
            </h2>
            <p className="text-cream/60 text-sm leading-relaxed max-w-md">
              We publish exactly how we source, verify, and import every item we sell. If you'd like the full breakdown of our verification process, it's all laid out on our Authenticity Guarantee page.
            </p>
          </div>
          <Link href="/authenticity" className="btn-primary w-fit md:justify-self-end">
            See Our Authenticity Process <ArrowRight size={15} />
          </Link>
        </ScrollReveal>
      </section>

      {/* Why Trust Us — every figure here is one we can actually stand behind;
          no invented customer counts or review scores. */}
      {stats.length > 0 && (
        <section className="bg-ink text-cream section-py">
          <div className="container-px mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <p className="font-display text-4xl md:text-5xl font-semibold text-white">{stat.value}</p>
                <p className="text-xs text-cream/55 mt-2 uppercase tracking-wide">{stat.label}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      {/* Brand Partners */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">Brand Partners</p>
          <h2 className="section-title">Sourced directly. Nothing in between.</h2>
        </ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {[
            ["cosrx", "COSRX"],
            ["beauty-of-joseon", "Beauty of Joseon"],
            ["anua", "Anua"],
            ["skin1004", "SKIN1004"],
            ["round-lab", "Round Lab"],
            ["laneige", "Laneige"],
          ].map(([slug, label], i) => (
            <ScrollReveal key={slug} delay={i * 0.05}>
              <Link
                href={`/brands/${slug}`}
                className="flex items-center justify-center h-24 rounded-xl2 bg-white border border-border-soft shadow-soft hover:shadow-e3 hover:-translate-y-1 transition-all font-display text-sm md:text-base text-center px-2 text-ink/70 hover:text-rose-gold-text"
              >
                {label}
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-px mx-auto section-py max-w-2xl">
        <ScrollReveal className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">Common Questions</p>
          <h2 className="section-title">Still have questions?</h2>
        </ScrollReveal>
        <ScrollReveal>
          <FaqAccordion items={FAQS} />
        </ScrollReveal>
        <p className="text-center mt-8">
          <Link href="/faq" className="text-sm text-rose-gold-text hover:underline inline-flex items-center gap-1.5">
            See all FAQs <ArrowRight size={14} />
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="container-px mx-auto pb-24">
        {/* Same accessible fill as .btn-primary: white on the brand rose-gold is
            2.84:1, which fails even the relaxed 3.0 large-text threshold. */}
        <ScrollReveal className="rounded-xl2 bg-[#A35252] text-white text-center p-14 md:p-20">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">{text(content, "ctaTitle")}</h2>
          {/* white/90, not /80: at 80% this measures 4.08:1 on the panel fill,
              just under the 4.5 floor for body-size text. */}
          <p className="text-white/90 max-w-md mx-auto mb-8">{text(content, "ctaBody")}</p>
          <Link href="/shop" className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-white text-rose-gold-text px-8 text-sm font-medium shadow-e3 hover:-translate-y-0.5 transition-all">
            {text(content, "ctaButton")} <ArrowRight size={15} />
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
