import Link from "next/link";
import { MessageCircle, Mail, Instagram, Facebook, Phone, Clock, Timer, MapPin, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import ContactForm from "@/components/ContactForm";
import FaqAccordion from "@/components/FaqAccordion";
import { getBusinessInfo, getPageContent, text, rows } from "@/server/content";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  // Both the shop's own details and this page's wording are admin-editable —
  // see Admin → Site Content → Business Info / Contact Us.
  const [business, content] = await Promise.all([getBusinessInfo(), getPageContent("contact")]);

  const whatsappDigits = business.phone.replace(/\D/g, "");
  const facebookPageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;
  const messengerUrl = facebookPageId ? `https://m.me/${facebookPageId}` : business.facebookUrl;
  const faqs = rows(content, "faqs").map((f) => ({ q: f.q || "", a: f.a || "" }));

  const CONTACT_CARDS = [
    { icon: Phone, label: "Call Us", value: `+${whatsappDigits}`, href: `tel:+${whatsappDigits}`, accent: "text-rose-gold" },
    { icon: MessageCircle, label: "WhatsApp", value: `+${whatsappDigits}`, href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined, accent: "text-success" },
    { icon: Mail, label: "Email", value: business.email, href: `mailto:${business.email}`, accent: "text-rose-gold" },
    { icon: Facebook, label: "Messenger", value: "Chat on Facebook", href: messengerUrl, accent: "text-[#1877F2]" },
    { icon: Instagram, label: "Instagram", value: `@${business.instagramHandle}`, href: business.instagramUrl, accent: "text-rose-gold" },
  ];

  return (
    <div className="container-px mx-auto section-py">
      <ScrollReveal className="text-center max-w-lg mx-auto mb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "eyebrow")}</p>
        <h1 className="section-title mb-4">{text(content, "title")}</h1>
        <p className="text-body text-sm">{text(content, "intro")}</p>
      </ScrollReveal>

      {/* Contact cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-16">
        {CONTACT_CARDS.map(({ icon: Icon, label, value, href, accent }, i) => (
          <ScrollReveal key={label} delay={i * 0.08}>
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="card-surface p-6 flex flex-col items-center text-center h-full"
            >
              <div className="h-12 w-12 rounded-full bg-beige/70 flex items-center justify-center mb-4">
                <Icon size={20} className={accent} />
              </div>
              <p className="font-medium text-sm text-ink mb-1">{label}</p>
              <p className="text-xs text-body">{value}</p>
            </a>
          </ScrollReveal>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 mb-20">
        {/* Left: hours, response time, map */}
        <ScrollReveal className="space-y-6">
          <div className="card-surface p-7 grid grid-cols-2 gap-6">
            <div>
              <Clock size={18} className="text-rose-gold mb-3" />
              <p className="text-sm font-medium mb-1">Business Hours</p>
              <p className="text-xs text-body leading-relaxed">{business.hoursPrimary}<br />{business.hoursSecondary}</p>
            </div>
            <div>
              <Timer size={18} className="text-rose-gold mb-3" />
              <p className="text-sm font-medium mb-1">Response Time</p>
              <p className="text-xs text-body leading-relaxed">{business.responseTime}</p>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <iframe
              title={`Seoul Glow Bangladesh location — ${business.addressShort}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&output=embed`}
              className="w-full h-56 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <p className="flex items-start gap-2 text-xs text-body px-5 py-3.5">
              <MapPin size={13} className="text-rose-gold shrink-0 mt-0.5" /> {business.addressFull}
            </p>
          </div>
        </ScrollReveal>

        {/* Right: form */}
        <ScrollReveal delay={0.1} className="card-surface p-8">
          <h2 className="font-display text-xl font-semibold mb-1">{text(content, "formTitle")}</h2>
          <p className="text-xs text-body mb-6">{text(content, "formNote")}</p>
          <ContactForm />
        </ScrollReveal>
      </div>

      {/* FAQ */}
      <div className="max-w-xl mx-auto">
        <ScrollReveal className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{text(content, "faqEyebrow")}</p>
          <h2 className="section-title">{text(content, "faqTitle")}</h2>
        </ScrollReveal>
        <ScrollReveal>
          <FaqAccordion items={faqs} />
        </ScrollReveal>
        <p className="text-center mt-8">
          <Link href="/faq" className="link-tap text-sm text-rose-gold-text hover:underline inline-flex items-center gap-1.5">
            See all FAQs <ArrowRight size={14} />
          </Link>
        </p>
      </div>
    </div>
  );
}
