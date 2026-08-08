import { describe, it, expect } from "vitest";
import { rowsToPosts, postToRow, BLOG_POSTS } from "@/lib/blog-posts";

/**
 * Articles are typed into an admin form, so every field arrives as a possibly
 * blank string. rowsToPosts is the only thing standing between that and the
 * live journal — a dropped article, a colliding URL or an Invalid Date sort are
 * all silent failures on the storefront rather than errors anyone would see.
 */
describe("rowsToPosts", () => {
  it("keeps a fully filled row intact", () => {
    const [post] = rowsToPosts([
      {
        title: "Double Cleansing in Dhaka",
        slug: "double-cleansing-in-dhaka",
        image: "https://example.com/a.jpg",
        excerpt: "Why the second cleanse matters here.",
        category: "Routines",
        author: "Editorial",
        date: "2026-05-01",
        body: "First para.\n\nSecond para.",
      },
    ]);
    expect(post.slug).toBe("double-cleansing-in-dhaka");
    expect(post.image).toBe("https://example.com/a.jpg");
    expect(post.content).toEqual(["First para.", "Second para."]);
  });

  it("builds a slug from the title when the admin leaves it blank", () => {
    const [post] = rowsToPosts([{ title: "Snail Mucin, Explained!", body: "x" }]);
    expect(post.slug).toBe("snail-mucin-explained");
  });

  it("never lets two articles share one URL", () => {
    const posts = rowsToPosts([
      { title: "Sunscreen", date: "2026-01-02", body: "a" },
      { title: "Sunscreen", date: "2026-01-01", body: "b" },
    ]);
    expect(posts.map((p) => p.slug)).toEqual(["sunscreen", "sunscreen-2"]);
  });

  it("shows an article whose photo hasn't been uploaded yet rather than hiding it", () => {
    const [post] = rowsToPosts([{ title: "Draft", image: "", body: "x" }]);
    expect(post.image).not.toBe("");
  });

  it("drops a row with no title — that's an empty row the admin added and left", () => {
    expect(rowsToPosts([{ title: "   ", body: "x" }])).toHaveLength(0);
  });

  it("orders newest first and sorts undated articles last, not as Invalid Date", () => {
    const posts = rowsToPosts([
      { title: "Older", date: "2026-01-01", body: "x" },
      { title: "Undated", date: "", body: "x" },
      { title: "Newer", date: "2026-06-01", body: "x" },
    ]);
    expect(posts.map((p) => p.title)).toEqual(["Newer", "Older", "Undated"]);
  });

  it("round-trips the shipped articles through the editor's row shape", () => {
    // PAGE_DEFAULTS.blog is built with postToRow, so a shop that never opens
    // the editor must still get exactly the articles the site ships with.
    const back = rowsToPosts(BLOG_POSTS.map(postToRow));
    expect(back).toHaveLength(BLOG_POSTS.length);
    for (const original of BLOG_POSTS) {
      const round = back.find((p) => p.slug === original.slug);
      expect(round, `${original.slug} survived the round trip`).toBeDefined();
      expect(round!.title).toBe(original.title);
      expect(round!.image).toBe(original.image);
      expect(round!.content).toEqual(original.content);
    }
  });
});
