import Link from "next/link";
import { PackageX, CalendarClock, ShieldAlert, Archive, MessageSquare, Search, CheckCircle2, Banknote, ArrowRight, XCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { getPageContent, text, rows } from "@/server/content";

export const metadata = { title: "Refund Policy" };

// Design-level, not content: the nth card/step keeps the nth icon regardless of
// how the admin rewords it.
const CONDITION_ICONS = [PackageX, CalendarClock, Archive, ShieldAlert];
const STEP_ICONS = [MessageSquare, Search, CheckCircle2, Banknote];

export default async function RefundPolicyPage() {
  const content = await getPageContent("refund-policy");
  const conditions = rows(content, "conditions");
  const steps = rows(content, "steps");
  const examples = rows(content, "examples");

  return (
    <div className="container-px mx-auto section-py max-w-3xl">
      <ScrollReveal className="text-center mb-14">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "eyebrow")}</p>
        <h1 className="section-title mb-4">{text(content, "title")}</h1>
        <p className="text-body text-sm max-w-md mx-auto">{text(content, "intro")}</p>
      </ScrollReveal>

      {/* Conditions */}
      {conditions.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {conditions.map((c, i) => {
            const Icon = CONDITION_ICONS[i % CONDITION_ICONS.length];
            return (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="card-surface p-6 h-full">
                  <div className="h-10 w-10 rounded-full bg-rose-gold/10 flex items-center justify-center mb-4">
                    <Icon size={18} className="text-rose-gold" />
                  </div>
                  <h3 className="font-medium text-sm mb-2">{c.title}</h3>
                  <p className="text-xs text-body leading-relaxed">{c.body}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* Timeline */}
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

      {/* Examples */}
      {examples.length > 0 && (
        <>
          <ScrollReveal className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "examplesEyebrow")}</p>
            <h2 className="section-title">{text(content, "examplesTitle")}</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {examples.map((ex, i) => {
              const eligible = (ex.eligible || "").trim().toLowerCase() === "yes";
              return (
                <ScrollReveal key={i}>
                  <div className={`rounded-xl2 p-6 border ${eligible ? "bg-success/5 border-success/20" : "bg-badge-sale/5 border-badge-sale/20"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {eligible ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle2 size={14} /> Eligible for Refund</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-badge-sale"><XCircle size={14} /> Not Eligible</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink mb-1.5">&ldquo;{ex.scenario}&rdquo;</p>
                    <p className="text-xs text-body leading-relaxed">{ex.note}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </>
      )}

      <ScrollReveal className="text-center">
        <p className="text-sm text-body mb-4">Ready to start a return, or not sure if yours qualifies?</p>
        <Link href="/contact" className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-rose-gold px-8 text-sm font-medium text-white shadow-soft hover:-translate-y-0.5 transition-all">
          Contact Support <ArrowRight size={15} />
        </Link>
      </ScrollReveal>
    </div>
  );
}
