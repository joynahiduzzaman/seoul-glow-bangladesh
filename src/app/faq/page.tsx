import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import FaqPageClient from "@/components/FaqPageClient";
import { getPageContent, text, rows } from "@/server/content";
import type { FaqEntry } from "@/lib/faq-data";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const content = await getPageContent("faq");
  const entries = rows(content, "entries").map(
    (e): FaqEntry => ({ category: e.category || "", q: e.q || "", a: e.a || "" })
  );

  return (
    <div className="container-px mx-auto section-py">
      <ScrollReveal className="text-center max-w-lg mx-auto mb-14">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "eyebrow")}</p>
        <h1 className="section-title mb-4">{text(content, "title")}</h1>
        <p className="text-body text-sm">{text(content, "intro")}</p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <Suspense fallback={null}>
          <FaqPageClient entries={entries} />
        </Suspense>
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="max-w-2xl mx-auto mt-8">
        <div className="rounded-xl2 bg-beige/60 p-8 text-center">
          <MessageCircle size={22} className="text-rose-gold mx-auto mb-3" />
          <p className="font-medium text-sm text-ink mb-1">{text(content, "ctaTitle")}</p>
          <p className="text-xs text-body mb-5">{text(content, "ctaBody")}</p>
          <Link href="/contact" className="btn-outline !h-10 !px-6 !text-xs">Contact Us</Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
