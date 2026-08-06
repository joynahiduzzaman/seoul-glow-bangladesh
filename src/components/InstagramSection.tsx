import { Instagram } from "lucide-react";
import Image from "next/image";
import { getInstagramPosts, type InstagramPost } from "@/server/instagram";

/**
 * Live Instagram feed.
 *
 * The stock-photo grid this replaced was decorative filler dressed as social
 * proof — six Unsplash images that had never appeared on the account. Posts are
 * real or the grid is absent; there is no third state where the section invents
 * content, because a fake feed is worse than no feed.
 *
 * A server component, so the token never reaches the browser and the fetch is
 * cached by Next rather than repeated per visitor. See server/instagram.ts for
 * why the Graph API is the only remaining option.
 */
export default async function InstagramSection({
  title,
  subtitle,
  handle: handleOverride,
  postLimit = 6,
  backgroundColor,
}: {
  title?: string;
  subtitle?: string;
  handle?: string;
  /** Clamped to 4–8; the grid is designed around that range. */
  postLimit?: number;
  backgroundColor?: string;
}) {
  const handle = handleOverride || "seoulglowbangladesh";
  const profileUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || `https://www.instagram.com/${handle}/`;
  const limit = Math.min(Math.max(postLimit, 4), 8);

  const posts = await getInstagramPosts(limit);

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="text-center mb-8">
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-text font-semibold mb-2">{subtitle}</p>
        )}
        <h2 className="section-title mb-2">{title || "Follow the Glow"}</h2>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-tap inline-flex items-center gap-2 text-rose-gold-text hover:underline font-medium"
        >
          <Instagram size={16} aria-hidden="true" /> @{handle}
        </a>
      </div>

      {posts && posts.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostTile key={post.id} post={post} handle={handle} />
          ))}
        </ul>
      ) : (
        <FeedUnavailable profileUrl={profileUrl} handle={handle} />
      )}
    </section>
  );
}

function PostTile({ post, handle }: { post: InstagramPost; handle: string }) {
  // The caption is the only meaningful description of the image; fall back to
  // naming the account so the link is never announced as just "link".
  const label = post.caption
    ? `Instagram post: ${post.caption.replace(/\s+/g, " ").trim().slice(0, 80)}`
    : `View this post from @${handle} on Instagram`;

  return (
    <li>
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="group relative block aspect-square overflow-hidden rounded-lg bg-beige"
      >
        <Image
          src={post.mediaUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div
          className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/25"
          aria-hidden="true"
        >
          <Instagram size={20} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {post.mediaType === "VIDEO" && (
          <span className="absolute right-2 top-2 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] font-semibold text-white" aria-hidden="true">
            Video
          </span>
        )}
      </a>
    </li>
  );
}

/**
 * Shown whenever the feed cannot be produced — unconfigured, expired token, or a
 * Meta outage. Deliberately does not explain which: a visitor does not care, and
 * naming the cause on a public page leaks configuration detail. It reads as an
 * invitation rather than an error.
 */
function FeedUnavailable({ profileUrl, handle }: { profileUrl: string; handle: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl2 border border-border-soft bg-white/60 px-6 py-10 text-center">
      <Instagram size={26} className="mx-auto mb-3 text-rose-gold-text" aria-hidden="true" />
      <p className="text-sm text-ink/70">
        See our latest arrivals, routines and customer glow-ups over on Instagram.
      </p>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-5 inline-flex"
      >
        Visit @{handle}
      </a>
    </div>
  );
}

/**
 * Streamed placeholder while the feed loads. Mirrors the real grid's dimensions
 * exactly — same aspect ratio, same column counts — so nothing shifts when the
 * posts arrive. A skeleton that changes the layout is worse than no skeleton.
 */
export function InstagramSkeleton({
  postLimit = 6,
  backgroundColor,
}: {
  postLimit?: number;
  backgroundColor?: string;
}) {
  const count = Math.min(Math.max(postLimit, 4), 8);
  return (
    <section
      className="container-px mx-auto section-py"
      style={backgroundColor ? { backgroundColor } : undefined}
      aria-busy="true"
      aria-label="Loading Instagram posts"
    >
      <div className="text-center mb-8">
        <div className="mx-auto mb-2 h-7 w-48 animate-pulse rounded bg-ink/10" />
        <div className="mx-auto h-4 w-36 animate-pulse rounded bg-ink/5" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-ink/5" />
        ))}
      </div>
    </section>
  );
}
