import { getPageContent, rows, text } from "@/server/content";
import { rowsToPosts, type BlogPost } from "@/lib/blog-posts";

/**
 * The live journal.
 *
 * Articles are rows on the `blog` PageContent record, edited at
 * /admin/content/blog with the same repeatable-row editor every other content
 * page uses — which is where an article's photo now comes from. getPageContent
 * merges saved rows over the shipped defaults, so a shop that has never opened
 * that editor still gets the three articles the site launched with.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const content = await getPageContent("blog");
  return rowsToPosts(rows(content, "posts"));
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getBlogPosts()).find((p) => p.slug === slug);
}

/** The /blog page's own header copy, editable alongside the articles. */
export async function getBlogPageHeader() {
  const content = await getPageContent("blog");
  return {
    eyebrow: text(content, "eyebrow"),
    title: text(content, "title"),
    intro: text(content, "intro"),
  };
}
