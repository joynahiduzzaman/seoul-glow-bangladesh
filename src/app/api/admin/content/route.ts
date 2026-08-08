import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";
import { BUSINESS_DEFAULTS, getPageDef, type PageDef } from "@/lib/site-content";
import { invalidateBusinessInfo, invalidatePageContent } from "@/server/content";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return user;
}

/**
 * Purge the rendered pages that show this content, not just the cached read.
 *
 * invalidatePageContent clears the data cache, which is what getPageContent
 * reads through — but the storefront routes that called it keep their own
 * rendered output until something tells them otherwise. Every other admin write
 * on the site (brands, categories, homepage sections) already pairs its write
 * with revalidatePath for exactly this reason; the content editor was the one
 * that didn't, which is why an admin who had just saved saw the new version and
 * everyone else went on seeing the old one until the 5-minute window lapsed.
 */
function revalidateFor(def: PageDef) {
  invalidatePageContent(def.key);
  revalidatePath(def.path);
  for (const extra of def.alsoRevalidate || []) {
    // "page" for a dynamic segment like /blog/[slug] — without the hint Next
    // treats the brackets as a literal path and purges nothing.
    revalidatePath(extra, extra.includes("[") ? "page" : undefined);
  }
}

// A field value is either a plain string or a list of string-keyed rows —
// mirrors the `FieldType` union in src/lib/site-content.ts.
const valueSchema = z.union([z.string(), z.array(z.record(z.string()))]);

const bodySchema = z.object({
  /** "business" for the global info, otherwise a PAGE_DEFS key. */
  target: z.string().min(1),
  values: z.record(valueSchema),
});

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { target, values } = parsed.data;

  if (target === "business") {
    // Whitelist against BUSINESS_DEFAULTS so an arbitrary key can't be written
    // into the settings table by a crafted request.
    const allowed = Object.keys(BUSINESS_DEFAULTS);
    const entries = Object.entries(values).filter(
      ([k, v]) => allowed.includes(k) && typeof v === "string"
    ) as Array<[string, string]>;

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    );
    invalidateBusinessInfo();
    // The phone number, address and socials sit in the footer, which is in the
    // root layout — so this one really does affect every page.
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  }

  const def = getPageDef(target);
  if (!def) return NextResponse.json({ error: "Unknown page" }, { status: 404 });

  // Same whitelist principle: only keys this page actually declares are stored.
  const allowedKeys = new Set(def.groups.flatMap((g) => g.fields.map((f) => f.key)));
  const clean = Object.fromEntries(Object.entries(values).filter(([k]) => allowedKeys.has(k)));

  await prisma.pageContent.upsert({
    where: { pageKey: target },
    create: { pageKey: target, content: JSON.stringify(clean) },
    update: { content: JSON.stringify(clean) },
  });
  revalidateFor(def);

  return NextResponse.json({ success: true });
}

/** Clears saved overrides so the page falls back to the shipped defaults. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const target = new URL(req.url).searchParams.get("target");
  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  if (target === "business") {
    await prisma.siteSetting.deleteMany({});
    invalidateBusinessInfo();
    revalidatePath("/", "layout");
  } else {
    const def = getPageDef(target);
    if (!def) return NextResponse.json({ error: "Unknown page" }, { status: 404 });
    await prisma.pageContent.deleteMany({ where: { pageKey: target } });
    // Resetting to the shipped defaults has to reach the storefront just as a
    // save does, or the page keeps rendering the copy you just discarded.
    revalidateFor(def);
  }
  return NextResponse.json({ success: true });
}
