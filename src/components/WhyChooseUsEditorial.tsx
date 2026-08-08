import Image from "next/image";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { Dictionary } from "@/lib/i18n/dictionaries";
import EditorialImageSwiper from "./EditorialImageSwiper";
import { resolveAuthenticityImages } from "@/lib/section-images";

export { DEFAULT_AUTHENTICITY_IMAGE } from "@/lib/section-images";

export default function WhyChooseUsEditorial({
  dict,
  title,
  subtitle,
  image,
  images,
  backgroundColor,
}: {
  dict: Dictionary;
  title?: string;
  subtitle?: string;
  /** Legacy single-photo key, still honoured. */
  image?: string;
  images?: string[];
  backgroundColor?: string;
}) {
  const photos = resolveAuthenticityImages(images, image);
  const items = [
    { icon: ShieldCheck, title: dict.home.whyAuthentic, desc: dict.home.whyAuthenticDesc },
    { icon: Truck, title: dict.home.whyDelivery, desc: dict.home.whyDeliveryDesc },
    { icon: RotateCcw, title: dict.home.whyReturns, desc: dict.home.whyReturnsDesc },
  ];

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
        {/* Same box either way — the swipe lives inside it, so one photo or
            five, the section's layout is identical. */}
        <div className="relative aspect-[4/5] rounded-xl2 overflow-hidden">
          {photos.length > 1 ? (
            <EditorialImageSwiper images={photos} />
          ) : (
            <Image
              src={photos[0]}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold mb-4">{subtitle || "Why Seoul Glow"}</p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8 leading-tight">
            {title || "Real Korean skincare, delivered the way it should be."}
          </h2>
          <div className="space-y-6">
            {items.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-display text-lg mb-1">{title}</h3>
                  <p className="text-sm text-ink/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
