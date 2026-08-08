import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight } from "lucide-react";
import { getCategories, getReadingTime, formatBlogDate } from "@/lib/blog-posts";
import { getBlogPosts, getBlogPageHeader } from "@/server/blog";
import ScrollReveal from "@/components/ScrollReveal";
import Newsletter from "@/components/Newsletter";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata = { title: "Blog" };

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const activeCategory = searchParams.category;
  const [allPosts, header] = await Promise.all([getBlogPosts(), getBlogPageHeader()]);
  const categories = getCategories(allPosts);
  const posts = activeCategory ? allPosts.filter((p) => p.category === activeCategory) : allPosts;

  const [featured, ...rest] = posts;
  const locale = getLocale();
  const dict = getDictionary(locale);

  if (!featured) {
    return (
      <div className="container-px mx-auto section-py text-center">
        <h1 className="section-title mb-4">Skincare Journal</h1>
        <p className="text-body text-sm mb-6">No articles in this category yet.</p>
        <Link href="/blog" className="link-tap text-sm text-rose-gold-text hover:underline">← View all articles</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="container-px mx-auto section-py">
        <ScrollReveal className="max-w-lg mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{header.eyebrow}</p>
          <h1 className="section-title mb-3">{header.title}</h1>
          <p className="text-body text-sm">{header.intro}</p>
        </ScrollReveal>

        {/* Category filter */}
        <ScrollReveal className="flex flex-wrap gap-2 mb-12">
          <Link
            href="/blog"
            className={`text-xs rounded-full border px-4 py-2 transition-colors ${!activeCategory ? "bg-ink text-white border-ink" : "border-border-soft text-ink/70 hover:border-rose-gold hover:text-rose-gold"}`}
          >
            All Articles
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${encodeURIComponent(cat)}`}
              className={`text-xs rounded-full border px-4 py-2 transition-colors ${activeCategory === cat ? "bg-ink text-white border-ink" : "border-border-soft text-ink/70 hover:border-rose-gold hover:text-rose-gold"}`}
            >
              {cat}
            </Link>
          ))}
        </ScrollReveal>

        {/* Featured article */}
        <ScrollReveal delay={0.1}>
          <Link href={`/blog/${featured.slug}`} className="group grid md:grid-cols-2 gap-8 items-center rounded-xl2 overflow-hidden bg-white border border-border-soft shadow-soft hover:shadow-glass transition-shadow mb-16">
            <div className="relative aspect-[16/10] md:aspect-auto md:h-full overflow-hidden">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-8 md:pr-12">
              <span className="text-[11px] uppercase tracking-wide text-rose-gold-text font-semibold">Featured · {featured.category}</span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-3 mb-4 leading-snug group-hover:text-rose-gold transition-colors">
                {featured.title}
              </h2>
              <p className="text-sm text-body leading-relaxed mb-5 line-clamp-3">{featured.excerpt}</p>
              <div className="flex items-center gap-3 text-xs text-ink/70 mb-6">
                <span>{featured.author}</span>
                <span>·</span>
                <span>{formatBlogDate(featured.date)}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {getReadingTime(featured)} min read</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-gold-text">
                Read the article <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </ScrollReveal>

        {/* Remaining posts */}
        {rest.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8">
            {rest.map((post, i) => (
              <ScrollReveal key={post.slug} delay={i * 0.08}>
                <Link href={`/blog/${post.slug}`} className="group block h-full rounded-xl2 overflow-hidden bg-white border border-border-soft shadow-soft hover:shadow-glass transition-all hover:-translate-y-1">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image src={post.image} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wide font-semibold bg-white/90 backdrop-blur text-ink px-2.5 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-lg font-semibold mb-2 leading-snug group-hover:text-rose-gold-text transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-body leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-[11px] text-ink/70">
                      <span>{post.author}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {getReadingTime(post)} min</span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      <Newsletter dict={dict} />
    </div>
  );
}
