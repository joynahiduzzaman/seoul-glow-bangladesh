import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PAGE_DEFS } from "@/lib/site-content";

/**
 * Clearing the data cache is not the same as purging the pages that read it.
 *
 * The content editor called invalidatePageContent (a revalidateTag) and stopped
 * there, so the admin who had just saved saw the new copy — their save had
 * refreshed what they then loaded — while every other visitor kept being served
 * the already-rendered page until the 5-minute window lapsed. Every other admin
 * write on the site pairs its write with revalidatePath; this one didn't.
 *
 * Source checks, because the defect is a missing call, not a wrong result.
 */
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("site content saves reach the storefront", () => {
  const source = read("src/app/api/admin/content/route.ts");

  it("purges the rendered page, not just the cached read", () => {
    expect(source).toMatch(/import \{ revalidatePath \} from "next\/cache"/);
    expect(source).toMatch(/revalidatePath\(def\.path\)/);
  });

  it("purges on reset as well as on save", () => {
    // Resetting to defaults is just as much a content change; if only the save
    // path purged, discarding your edits would leave them on screen.
    const del = source.slice(source.indexOf("export async function DELETE"));
    expect(del).toMatch(/revalidateFor\(def\)|revalidatePath\(/);
  });

  it("refreshes every page when the business info changes", () => {
    // Phone, address and socials live in the footer, which is in the root
    // layout — a single path purge would leave every other page stale.
    expect(source).toMatch(/revalidatePath\("\/", "layout"\)/);
  });

  it("passes the 'page' hint for dynamic route patterns", () => {
    // revalidatePath("/blog/[slug]") without the second argument treats the
    // brackets as a literal path segment and purges nothing.
    expect(source).toMatch(/includes\("\["\)\s*\?\s*"page"/);
  });
});

describe("page definitions declare everywhere their content appears", () => {
  it("the journal purges the article pages and the homepage rail too", () => {
    const blog = PAGE_DEFS.find((p) => p.key === "blog");
    expect(blog).toBeDefined();
    // An article is rendered in three places; purging only /blog would leave
    // the other two showing the previous photo.
    expect(blog!.alsoRevalidate).toContain("/blog/[slug]");
    expect(blog!.alsoRevalidate).toContain("/");
  });

  it("every declared extra route is a route pattern, not a filled-in URL", () => {
    for (const def of PAGE_DEFS) {
      for (const extra of def.alsoRevalidate || []) {
        expect(extra.startsWith("/"), `${def.key}: ${extra}`).toBe(true);
      }
    }
  });
});
