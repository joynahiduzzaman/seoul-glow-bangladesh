import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Building2, ScanLine, PlaneTakeoff, PackageSearch, QrCode, ArrowRight, BadgeCheck, Globe2 } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata = { title: "Authenticity Guarantee" };

const PROCESS = [
  { icon: Building2, title: "Direct Supplier Relationships", body: "We buy only from Korean brands and their officially authorized distributors — every supplier relationship is verified before we list a single product." },
  { icon: PlaneTakeoff, title: "Proper Import & Customs", body: "Every shipment is imported and cleared through legitimate channels, with full documentation kept on file — not carried in through informal or grey-market routes." },
  { icon: PackageSearch, title: "Warehouse Spot-Checks", body: "Incoming stock is spot-checked against the batch and authenticity codes recorded at sourcing before it's added to inventory." },
  { icon: ScanLine, title: "Listed With Full Traceability", body: "Each product page notes its batch number and country of origin, so what you see before buying matches what arrives." },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "100% Authentic" },
  { icon: BadgeCheck, label: "Batch-Verified" },
  { icon: Globe2, label: "Direct From Seoul" },
  { icon: QrCode, label: "Traceable Batch Codes" },
];

const FAQS = [
  { q: "How can I check if my product is authentic?", a: "Every product ships with its manufacturer's batch code printed on the packaging. Most Korean brands (like COSRX and Beauty of Joseon) offer official batch/QR verification tools on their own websites — you're welcome to cross-check there too." },
  { q: "What's a batch code, exactly?", a: "It's a manufacturing identifier printed on the box or tube — usually near the barcode — that ties the product back to its production run and manufacturing date. It's the manufacturer's own proof of origin, not something we generate ourselves." },
  { q: "What if I think I received a fake?", a: "Contact us immediately with your order number and photos of the product and packaging. We investigate every report, and you'll get a full refund if we can't verify authenticity." },
  { q: "Why buy from you instead of a marketplace listing?", a: "Marketplace listings often mix stock from multiple unverified sellers under one listing. We control our own sourcing end-to-end, so every unit we sell has been through the same verification process." },
];

export default function AuthenticityPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[56vh] min-h-[380px] flex items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1600&q=80"
          alt="Korean skincare packaging detail"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
        <div className="relative container-px mx-auto pb-14 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-gold-light font-semibold mb-4">Our Promise</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold max-w-xl leading-[1.05]">
            Authenticity isn't a claim we make. It's a process we follow.
          </h1>
        </div>
      </section>

      {/* Trust badges strip */}
      <div className="border-b border-border-soft bg-white">
        <div className="container-px mx-auto py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-ink/70">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2">
              <Icon size={16} className="text-rose-gold shrink-0" /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Process */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">How We Verify</p>
          <h2 className="section-title">Four checks, every single shipment.</h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 gap-6">
          {PROCESS.map(({ icon: Icon, title, body }, i) => (
            <ScrollReveal key={title} delay={i * 0.08}>
              <div className="card-surface p-7 h-full flex gap-5">
                <div className="h-11 w-11 rounded-full bg-rose-gold/10 flex items-center justify-center shrink-0">
                  <Icon size={19} className="text-rose-gold" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-body leading-relaxed">{body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Batch code explanation */}
      <section className="bg-beige/60 section-py">
        <div className="container-px mx-auto grid md:grid-cols-2 gap-14 items-center">
          <ScrollReveal>
            <div className="relative aspect-[4/3] rounded-xl2 overflow-hidden shadow-glass">
              <Image
                src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=80"
                alt="Skincare packaging showing printed batch code detail"
                fill
                className="object-cover"
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">Reading Your Batch Code</p>
            <h2 className="section-title mb-5">What that string of numbers actually proves.</h2>
            <div className="space-y-4 text-sm text-body leading-relaxed">
              <p>Every genuine product carries a manufacturer-printed batch code, usually near the barcode on the box or the bottom of the tube — it's how the brand itself tracks production runs and manufacturing dates.</p>
              <p>We record this code at sourcing and check it again against incoming stock at our warehouse, so the code on your product matches what we verified before it ever reached you.</p>
              <p>Many Korean brands also let you cross-check batch codes directly through their own official websites, if you'd like a second layer of verification straight from the manufacturer.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Direct sourcing statement */}
      <section className="container-px mx-auto section-py">
        <ScrollReveal className="rounded-xl2 bg-ink text-cream p-10 md:p-14 text-center max-w-2xl mx-auto">
          <Globe2 size={26} className="text-rose-gold-light mx-auto mb-6" />
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">Sourced from Korea. Nothing in between.</h2>
          <p className="text-cream/60 text-sm leading-relaxed max-w-md mx-auto mb-8">
            No resellers, no unofficial middlemen — just direct relationships with brands and their authorized distributors, from Seoul to our warehouse.
          </p>
          <Link href="/about" className="inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-cream/30 px-7 text-sm font-medium text-white hover:bg-white hover:text-ink transition-all">
            Read Our Story <ArrowRight size={15} />
          </Link>
        </ScrollReveal>
      </section>

      {/* FAQ */}
      <section className="container-px mx-auto section-py max-w-2xl">
        <ScrollReveal className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">Questions</p>
          <h2 className="section-title">Still have doubts?</h2>
        </ScrollReveal>
        <ScrollReveal>
          <FaqAccordion items={FAQS} />
        </ScrollReveal>
        <ScrollReveal className="text-center mt-10">
          <p className="text-sm text-body mb-4">Think you received something that isn't right? We'll make it right.</p>
          <Link href="/contact" className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-rose-gold px-8 text-sm font-medium text-white shadow-soft hover:-translate-y-0.5 transition-all">
            Report a Concern <ArrowRight size={15} />
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
