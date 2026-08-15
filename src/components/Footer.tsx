import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";
import { parseJsonArray } from "@/lib/utils";
import { getBusinessInfo } from "@/server/content";
import NewsletterFooterForm from "./NewsletterFooterForm";

/**
 * The four-up strip under "Follow @…" used to be stock photography, which on a
 * real shop reads as four Instagram posts that were never posted. It shows the
 * shop's own products now. If nothing is in the catalogue yet the strip is
 * simply omitted rather than filled with something borrowed.
 */
const getFooterPhotos = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", images: { not: "[]" } },
      orderBy: [{ isBestSeller: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { images: true },
    });
    return products
      .map((p) => parseJsonArray(p.images)[0])
      .filter((url): url is string => Boolean(url))
      .slice(0, 4);
  },
  ["footer-instagram-preview"],
  { revalidate: 300 }
);

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
  const [business, instagramPreview] = await Promise.all([getBusinessInfo(), getFooterPhotos()]);
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
            <li><Link href="/shop" className="link-tap hover:text-cream transition-colors">All Products</Link></li>
            <li><Link href="/shop?filter=bestseller" className="link-tap hover:text-cream transition-colors">Best Sellers</Link></li>
            <li><Link href="/shop?filter=new" className="link-tap hover:text-cream transition-colors">New Arrivals</Link></li>
            <li><Link href="/shop?filter=flashsale" className="link-tap hover:text-cream transition-colors">Flash Sale</Link></li>
            <li><Link href="/brands" className="link-tap hover:text-cream transition-colors">All Brands</Link></li>
            <li><Link href="/categories" className="link-tap hover:text-cream transition-colors">Shop by Category</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg mb-4">{dict.footer.company}</h4>
          <ul className="space-y-2.5 text-sm text-cream/60">
            <li><Link href="/about" className="link-tap hover:text-cream transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="link-tap hover:text-cream transition-colors">Contact</Link></li>
            <li><Link href="/blog" className="link-tap hover:text-cream transition-colors">Blog</Link></li>
            {/* Affiliate Program link intentionally removed — program is disabled for
                now. Re-add to re-enable: <li><Link href="/affiliate" className="link-tap hover:text-cream transition-colors">Affiliate Program</Link></li> */}
            <li><Link href="/authenticity" className="link-tap hover:text-cream transition-colors">Authenticity Guarantee</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg mb-4">{dict.footer.support}</h4>
          <ul className="space-y-2.5 text-sm text-cream/60">
            <li><Link href="/faq" className="link-tap hover:text-cream transition-colors">FAQ</Link></li>
            <li><Link href="/track-order" className="link-tap hover:text-cream transition-colors">Track Order</Link></li>
            <li><Link href="/shipping-policy" className="link-tap hover:text-cream transition-colors">Shipping Policy</Link></li>
            <li><Link href="/refund-policy" className="link-tap hover:text-cream transition-colors">Refund Policy</Link></li>
            <li><Link href="/privacy-policy" className="link-tap hover:text-cream transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="link-tap hover:text-cream transition-colors">Terms & Conditions</Link></li>
          </ul>
          <div className="mt-6 space-y-2 text-xs text-cream/55">
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[24px] items-center gap-2 hover:text-cream transition-colors">
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
            {/* link-tap is inline-flex, so the text is an anonymous flex item
                that will not shrink below its longest unbreakable word — and
                "@seoulglowbangladesh" is wider than this column once the footer
                splits at md. That pushed the whole document 9px wide on a 768px
                tablet, so every page scrolled sideways. `anywhere` is the one
                overflow-wrap value that reduces min-content size in flex
                layout; `break-word` would not have fixed this. */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-tap mb-3 max-w-full [overflow-wrap:anywhere] text-xs text-cream/55 transition-colors hover:text-cream"
            >
              Follow @{business.instagramHandle}
            </a>
            {instagramPreview.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {instagramPreview.map((img, i) => (
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
                  {/* next/image, not a raw <img>. These are full-resolution
                      catalogue photographs — 1 to 2 MB each straight from
                      Cloudinary — being displayed at about 80px square, in the
                      footer, on every page of the site. Four of them was ~4 MB
                      of the ~6.6 MB a page weighed. Through the optimizer the
                      same four come to roughly 20 KB.

                      `sizes` is what makes that work: without it next/image
                      assumes full viewport width and serves a 1920px-wide
                      variant for an 80px box. */}
                  <Image
                    src={img}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-300 hover:scale-110"
                  />
                </a>
              ))}
            </div>
            )}
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
