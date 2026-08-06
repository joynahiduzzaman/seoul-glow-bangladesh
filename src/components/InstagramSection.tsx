import { Instagram } from "lucide-react";

/**
 * Instagram callout — a single invitation to the profile, nothing more.
 *
 * There is deliberately no feed here. Meta's Basic Display API was shut down in
 * December 2024, and the Graph API that replaced it needs a Business account
 * inside an app that has cleared review; a manually curated grid was the other
 * option and carries an ongoing maintenance cost for what is, in the end, an
 * outbound link. So this stays one honest link rather than a gallery that either
 * goes stale or shows photography the account never posted.
 */
export default function InstagramSection({
  title,
  subtitle,
  handle: handleOverride,
  backgroundColor,
}: {
  title?: string;
  subtitle?: string;
  handle?: string;
  backgroundColor?: string;
}) {
  const handle = handleOverride || "seoulglowbangladesh";
  const profileUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || `https://www.instagram.com/${handle}/`;

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="mx-auto max-w-xl text-center">
        {subtitle && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-gold-text">{subtitle}</p>
        )}

        {/* The icon sits in a soft plate rather than bare on the background, so
            the block reads as a deliberate callout instead of a stray glyph. */}
        <span
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-e2 ring-1 ring-ink/5"
          aria-hidden="true"
        >
          <Instagram size={24} className="text-rose-gold-text" />
        </span>

        <h2 className="section-title mb-3">{title || `Follow @${handle}`}</h2>

        <p className="mx-auto mb-8 max-w-md leading-relaxed text-ink/70">
          New arrivals, honest routines and real customer glow-ups — shared first on Instagram.
        </p>

        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex">
          <Instagram size={16} aria-hidden="true" />
          Visit Instagram
        </a>
      </div>
    </section>
  );
}
