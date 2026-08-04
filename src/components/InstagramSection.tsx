import { Instagram } from "lucide-react";

const DEFAULT_GRID_IMAGES = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=400&q=80",
];

/** A "shop the grid" style Instagram callout using our own product photography —
 * not a live API embed (that needs Meta app review + your Instagram Business account
 * connected), just an honest, on-brand link out to the real profile. */
export default function InstagramSection({
  title,
  subtitle,
  handle: handleOverride,
  postLimit = 6,
  images,
  backgroundColor,
}: {
  title?: string;
  subtitle?: string;
  handle?: string;
  postLimit?: number;
  images?: string[];
  backgroundColor?: string;
}) {
  const handle = handleOverride || "seoulglowbangladesh";
  const url = process.env.NEXT_PUBLIC_INSTAGRAM_URL || `https://www.instagram.com/${handle}/`;
  const gridImages = (images && images.length > 0 ? images : DEFAULT_GRID_IMAGES).slice(0, postLimit);

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="text-center mb-8">
        {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold mb-2">{subtitle}</p>}
        <h2 className="section-title mb-2">{title || "Follow the Glow"}</h2>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-rose-gold-text hover:underline font-medium">
          <Instagram size={16} /> @{handle}
        </a>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {gridImages.map((img, i) => (
          // aria-label is required: both children are decorative (an alt=""
          // image and a hover-only icon), so the link has no accessible name
          // without it.
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open @${handle} on Instagram (photo ${i + 1})`}
            className="group relative aspect-square overflow-hidden rounded-lg"
          >
            <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors flex items-center justify-center" aria-hidden="true">
              <Instagram size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
