import Link from "next/link";
import { Truck, Banknote, MapPin, PackageCheck, Bell, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { getPageContent, text, rows } from "@/server/content";

export const metadata = { title: "Shipping Policy" };

// Icons belong to the design, not the content — the nth step keeps the nth icon
// however the admin rewords it.
const STEP_ICONS = [PackageCheck, Truck, Bell, MapPin];

export default async function ShippingPolicyPage() {
  const content = await getPageContent("shipping-policy");
  const zones = rows(content, "zones");
  const steps = rows(content, "steps");

  return (
    <div className="container-px mx-auto section-py max-w-3xl">
      <ScrollReveal className="text-center mb-14">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "eyebrow")}</p>
        <h1 className="section-title mb-4">{text(content, "title")}</h1>
        <p className="text-body text-sm max-w-md mx-auto">{text(content, "intro")}</p>
      </ScrollReveal>

      {/* Delivery zones */}
      {zones.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {zones.map((z, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="card-surface p-7">
                <div className="h-11 w-11 rounded-full bg-rose-gold/10 flex items-center justify-center mb-5">
                  <MapPin size={19} className="text-rose-gold" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">{z.zone}</h3>
                <p className="text-2xl font-semibold text-ink mb-1">{z.fee}</p>
                <p className="text-sm text-body">{z.time}</p>
                {z.note && <p className="text-xs text-success font-medium mt-3">{z.note}</p>}
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Payment note */}
      <ScrollReveal className="rounded-xl2 bg-beige/60 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start mb-16">
        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shrink-0">
          <Banknote size={22} className="text-rose-gold" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">{text(content, "codTitle")}</h2>
          <p className="text-sm text-body leading-relaxed mb-3">{text(content, "codBody1")}</p>
          <p className="text-sm text-body leading-relaxed">
            {text(content, "codBody2")}{" "}
            <Link href="/faq?category=payments" className="text-rose-gold hover:underline">See payment FAQs</Link>.
          </p>
        </div>
      </ScrollReveal>

      {/* Order journey timeline */}
      {steps.length > 0 && (
        <>
          <ScrollReveal className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "stepsEyebrow")}</p>
            <h2 className="section-title">{text(content, "stepsTitle")}</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="relative">
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
        </>
      )}

      <ScrollReveal className="text-center">
        <p className="text-sm text-body mb-4">Have a question about your specific order?</p>
        <Link href="/contact" className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-rose-gold px-8 text-sm font-medium text-white shadow-soft hover:-translate-y-0.5 transition-all">
          Contact Support <ArrowRight size={15} />
        </Link>
      </ScrollReveal>
    </div>
  );
}
