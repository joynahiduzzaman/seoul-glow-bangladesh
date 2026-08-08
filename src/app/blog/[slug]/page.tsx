import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { getReadingTime, getRelatedPosts, formatBlogDate } from "@/lib/blog-posts";
import { getBlogPosts } from "@/server/blog";
import ScrollReveal from "@/components/ScrollReveal";
import Newsletter from "@/components/Newsletter";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

// Articles are admin-editable now, so the set of slugs isn't known at build
// time. Pages render on demand and revalidate, which is also what lets a newly
// published article appear without a redeploy.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = (await getBlogPosts()).find((p) => p.slug === params.slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt, openGraph: { images: [post.image] } };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return notFound();

  const related = getRelatedPosts(posts, post);
  const dict = getDictionary(getLocale());

  return (
    <div>
      <article className="container-px mx-auto section-py max-w-2xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-rose-gold-text hover:underline mb-8">
          <ArrowLeft size={14} /> Back to Journal
        </Link>

        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-wide text-rose-gold-text font-semibold">{post.category}</span>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-3 mb-5 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-3 text-xs text-ink/70 mb-8">
            <span className="font-medium text-ink/70">{post.author}</span>
            <span>·</span>
            <span>{formatBlogDate(post.date)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {getReadingTime(post)} min read</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative aspect-[16/9] rounded-xl2 overflow-hidden mb-10 shadow-glass">
            <Image src={post.image} alt={post.title} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" priority />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="space-y-5 text-[17px] text-ink/80 leading-[1.8]">
            {post.content.map((para, i) => (
              <p key={i} className={i === 0 ? "first-letter:font-display first-letter:text-5xl first-letter:font-semibold first-letter:text-rose-gold first-letter:mr-2 first-letter:float-left first-letter:leading-[0.9]" : undefined}>
                {para}
              </p>
            ))}
          </div>
        </ScrollReveal>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="bg-beige/50 section-py">
          <div className="container-px mx-auto">
            <ScrollReveal className="text-center max-w-lg mx-auto mb-12">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">Keep Reading</p>
              <h2 className="section-title">Related Articles</h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-3 gap-8">
              {related.map((rp, i) => (
                <ScrollReveal key={rp.slug} delay={i * 0.08}>
                  <Link href={`/blog/${rp.slug}`} className="group block h-full rounded-xl2 overflow-hidden bg-white border border-border-soft shadow-soft hover:shadow-glass transition-all hover:-translate-y-1">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image src={rp.image} alt={rp.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="p-6">
                      <span className="text-[10px] uppercase tracking-wide text-rose-gold-text font-semibold">{rp.category}</span>
                      <h3 className="font-display text-base font-semibold mt-2 mb-2 leading-snug group-hover:text-rose-gold-text transition-colors line-clamp-2">
                        {rp.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs text-ink/70">
                        <Clock size={10} /> {getReadingTime(rp)} min read
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <Newsletter dict={dict} />
    </div>
  );
}
