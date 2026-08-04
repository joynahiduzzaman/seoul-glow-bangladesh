import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getBusinessInfo } from "@/server/content";
import NewsletterFooterForm from "./NewsletterFooterForm";

// Same real product photography used in InstagramSection.tsx — a compact preview here,
// not a fabricated "as featured in" wall or invented press/award badges.
const INSTAGRAM_PREVIEW = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=200&q=80",
];

const PAYMENT_METHODS = [
  { label: "Cash on Delivery" },
  { label: "bKash", comingSoon: true },
  { label: "Nagad", comingSoon: true },
];

const TRUST_STRIP = [
  { icon: ShieldCheck, label: "100% Authentic, Batch-Verified" },
  { icon: Truck, label: "Fast Delivery Across Bangladesh" },
  { icon: BadgeCheck, label: "Direct From Seoul, No Grey Market" },
];

export default async function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  // Contact details come from the admin-editable Business Info rather than
  // build-time env vars, so changing the phone number is a content edit.
  const business = await getBusinessInfo();
  const instagramUrl = business.instagramUrl;
  const whatsappNumber = business.phone.replace(/\D/g, "");

  return (
    <footer className="bg-ink text-cream mt-16 md:mt-24">
      {/* Trust strip — the Korean-beauty-philosophy promise made visible before anything
          else in the footer, not buried in a paragraph of body copy. */}
      <div className="border-b border-cream/10">
        <div className="container-px mx-auto py-4 md:py-6 flex flex-wrap items-center justify-center md:justify-between gap-x-10 gap-y-2 md:gap-y-3 text-xs text-cream/60">
          {TRUST_STRIP.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2">
              <Icon size={15} className="text-rose-gold-light shrink-0" /> {label}
            </span>
          ))}
        </div>
      </div>

      <div className="container-px mx-auto py-12 md:py-20 grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-10 md:gap-y-14">
        <div className="col-span-2 md:col-span-2 md:pr-8">
          <Link href="/" className="flex items-center gap-2.5 mb-5">
            <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={44} height={44} className="rounded-full" />
            <span className="font-display text-2xl font-semibold">Seoul Glow</span>
          </Link>
          <p className="text-cream/60 text-sm max-w-xs leading-relaxed">{dict.footer.tagline}</p>
          <p className="text-cream/55 text-xs max-w-xs leading-relaxed mt-4">
            Every product imported directly from South Korea and verified with a batch number and authenticity code — no grey-market resellers, ever.
          </p>
          <div className="flex gap-4 mt-6">
            <a href={business.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-rose-gold-light hover:-translate-y-0.5 transition-all"><Facebook size={18} /></a>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-rose-gold-light hover:-translate-y-0.5 transition-all"><Instagram size={18} /></a>
            <a href={`mailto:${business.email}`} aria-label="Email" className="hover:text-rose-gold-light hover:-translate-y-0.5 transition-all"><Mail size={18} /></a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg mb-4">{dict.footer.shop}</h4>
          <ul className="space-y-2.5 text-sm text-cream/60">
            <li><Link href="/shop" className="hover:text-cream transition-colors">All Products</Link></li>
            <li><Link href="/shop?filter=bestseller" className="hover:text-cream transition-colors">Best Sellers</Link></li>
            <li><Link href="/shop?filter=new" className="hover:text-cream transition-colors">New Arrivals</Link></li>
            <li><Link href="/shop?filter=flashsale" className="hover:text-cream transition-colors">Flash Sale</Link></li>
            <li><Link href="/shop?view=brands" className="hover:text-cream transition-colors">All Brands</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg mb-4">{dict.footer.company}</h4>
          <ul className="space-y-2.5 text-sm text-cream/60">
            <li><Link href="/about" className="hover:text-cream transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-cream transition-colors">Contact</Link></li>
            <li><Link href="/blog" className="hover:text-cream transition-colors">Blog</Link></li>
            {/* Affiliate Program link intentionally removed — program is disabled for
                now. Re-add to re-enable: <li><Link href="/affiliate" className="hover:text-cream transition-colors">Affiliate Program</Link></li> */}
            <li><Link href="/authenticity" className="hover:text-cream transition-colors">Authenticity Guarantee</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg mb-4">{dict.footer.support}</h4>
          <ul className="space-y-2.5 text-sm text-cream/60">
            <li><Link href="/faq" className="hover:text-cream transition-colors">FAQ</Link></li>
            <li><Link href="/track-order" className="hover:text-cream transition-colors">Track Order</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-cream transition-colors">Shipping Policy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-cream transition-colors">Refund Policy</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-cream transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-cream transition-colors">Terms & Conditions</Link></li>
          </ul>
          <div className="mt-6 space-y-2 text-xs text-cream/55">
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-cream transition-colors">
              <MessageCircle size={13} className="shrink-0" /> +{whatsappNumber}
            </a>
            <p className="flex items-start gap-2"><MapPin size={13} className="shrink-0 mt-0.5" /> {business.addressShort}</p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1">
          <h4 className="font-display text-lg mb-4">{dict.home.newsletterTitle}</h4>
          <p className="text-cream/55 text-xs leading-relaxed mb-4">{dict.home.newsletterDesc}</p>
          <NewsletterFooterForm dict={dict} />

          <div className="mt-8">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cream/55 hover:text-cream transition-colors mb-3 block">
              Follow @{business.instagramHandle}
            </a>
            <div className="grid grid-cols-4 gap-1.5">
              {INSTAGRAM_PREVIEW.map((img, i) => (
                // aria-label is required, not cosmetic: the only child is a
                // decorative image, so without it a screen reader announces
                // these as four unlabelled "link" elements.
                <a
                  key={i}
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open Seoul Glow Bangladesh on Instagram (photo ${i + 1})`}
                  className="relative aspect-square rounded-md overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover hover:scale-110 transition-transform duration-300" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-cream/10 py-7 container-px mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cream/55">
        <span>© {new Date().getFullYear()} Seoul Glow Bangladesh. {dict.footer.rights}</span>
        <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="mr-1">{dict.footer.weAccept}</span>
          {PAYMENT_METHODS.map((method) => (
            <span key={method.label} className="rounded-full border border-cream/15 px-3 py-1 text-cream/70">
              {method.label}
              {method.comingSoon && <span className="text-cream/55"> (Soon)</span>}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
