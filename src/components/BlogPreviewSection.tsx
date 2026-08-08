import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { getReadingTime, type BlogPost } from "@/lib/blog-posts";
import { SectionHeading, SectionViewAll } from "./SectionHeading";

// `allPosts` is passed in rather than imported: articles are admin-editable
// content read from the database now, and this component also renders inside
// the admin's client-side section preview, which can't await a server read.
export default function BlogPreviewSection({
  allPosts,
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
  allPosts: BlogPost[];
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
      ? postSlugs.map((slug) => allPosts.find((p) => p.slug === slug)).filter((p): p is BlogPost => Boolean(p))
      : allPosts.slice(0, postLimit);

  if (posts.length === 0) return null;

  return (
    <section className="container-px mx-auto section-py" style={backgroundColor ? { backgroundColor } : undefined}>
      <SectionHeading
        eyebrow={subtitle || "Skincare Journal"}
        title={title || "Latest From the Journal"}
        description="Routines, ingredients and honest guidance — written for Bangladesh's climate."
      />
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
      {showViewAll && <SectionViewAll href={viewAllUrl || "/blog"} label={viewAllText} />}
    </section>
  );
}
