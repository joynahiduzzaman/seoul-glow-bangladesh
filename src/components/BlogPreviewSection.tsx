import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { BLOG_POSTS, getReadingTime } from "@/lib/blog-posts";

export default function BlogPreviewSection({
  title,
  subtitle,
  postLimit = 3,
  mode = "auto",
  postSlugs = [],
  showViewAll = true,
  viewAllText,
  viewAllUrl,
  backgroundColor,
}: {
  title?: string;
  subtitle?: string;
  postLimit?: number;
  mode?: "auto" | "manual";
  postSlugs?: string[];
  showViewAll?: boolean;
  viewAllText?: string;
  viewAllUrl?: string;
  backgroundColor?: string;
}) {
  const posts =
    mode === "manual" && postSlugs.length > 0
      ? postSlugs.map((slug) => BLOG_POSTS.find((p) => p.slug === slug)).filter((p): p is (typeof BLOG_POSTS)[number] => Boolean(p))
      : BLOG_POSTS.slice(0, postLimit);

  if (posts.length === 0) return null;

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-3">{subtitle || "Skincare Journal"}</p>
          <h2 className="section-title">{title || "Latest From the Journal"}</h2>
        </div>
        {showViewAll && (
          <Link href={viewAllUrl || "/blog"} className="text-sm text-rose-gold-text hover:underline shrink-0">
            {viewAllText || "View all →"}
          </Link>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.slice(0, postLimit).map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 mb-4">
              <Image src={post.image} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wide font-semibold bg-white/90 backdrop-blur text-ink px-2.5 py-1 rounded-full">
                {post.category}
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold group-hover:text-rose-gold-text transition-colors leading-snug">{post.title}</h3>
            <p className="text-sm text-body line-clamp-2 mt-1.5 mb-3">{post.excerpt}</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink/70">
              <Clock size={10} /> {getReadingTime(post)} min read
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
