import Link from "next/link";
import { type LucideIcon, ArrowRight, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function ComingSoon({
  icon: Icon = Sparkles,
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  icon?: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="container-px mx-auto section-py flex justify-center">
      <ScrollReveal className="max-w-md text-center">
        <div className="h-14 w-14 rounded-full bg-rose-gold/10 flex items-center justify-center mx-auto mb-7">
          <Icon size={24} className="text-rose-gold" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{eyebrow}</p>
        <h1 className="section-title mb-4">{title}</h1>
        <p className="text-body text-sm leading-relaxed mb-9">{body}</p>
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-rose-gold px-8 text-sm font-medium text-white shadow-soft hover:-translate-y-0.5 transition-all"
        >
          {ctaLabel} <ArrowRight size={15} />
        </Link>
      </ScrollReveal>
    </div>
  );
}
