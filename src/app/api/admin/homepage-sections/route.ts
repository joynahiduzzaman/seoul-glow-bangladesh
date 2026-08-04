import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getAllHomepageSections } from "@/server/homepage";
import { prisma } from "@/server/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CUSTOM_SECTION_PREFIXES, definitionFor } from "@/lib/homepage-sections";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const sections = await getAllHomepageSections();
  return NextResponse.json({ sections });
}

const schema = z.object({
  template: z.enum(CUSTOM_SECTION_PREFIXES as [string, ...string[]]).optional(),
  duplicateFromId: z.string().optional(),
}).refine((d) => Boolean(d.template) !== Boolean(d.duplicateFromId), {
  message: "Provide exactly one of template or duplicateFromId",
});

/** Creates a new custom section — either a fresh instance of a template
 * ({ template: "customBanner" }) or a clone of an existing custom section
 * ({ duplicateFromId }). Always appended to the end of the layout; the admin
 * drags it into place afterward. Built-in sections can never be created this
 * way (they're seeded once and are singletons by design). */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const maxOrder = await prisma.homepageSection.aggregate({ _max: { displayOrder: true } });
  const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
  const newId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  if (parsed.data.template) {
    const def = definitionFor(parsed.data.template);
    if (!def) return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    const section = await prisma.homepageSection.create({
      data: {
        sectionKey: `${parsed.data.template}:${newId}`,
        title: def.label,
        settings: JSON.stringify(def.defaultSettings),
        displayOrder,
        enabled: true,
        isCustom: true,
      },
    });
    revalidatePath("/");
    return NextResponse.json({ section }, { status: 201 });
  }

  const source = await prisma.homepageSection.findUnique({ where: { id: parsed.data.duplicateFromId! } });
  if (!source) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  if (!source.isCustom) return NextResponse.json({ error: "Only custom sections can be duplicated" }, { status: 403 });

  const prefix = CUSTOM_SECTION_PREFIXES.find((p) => source.sectionKey.startsWith(`${p}:`));
  const section = await prisma.homepageSection.create({
    data: {
      sectionKey: `${prefix}:${newId}`,
      title: `${source.title} (Copy)`,
      settings: source.settings,
      displayOrder,
      enabled: source.enabled,
      isCustom: true,
    },
  });
  revalidatePath("/");
  return NextResponse.json({ section }, { status: 201 });
}
