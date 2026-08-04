import Link from "next/link";
import { prisma } from "@/server/db";
import { PAGE_DEFS } from "@/lib/site-content";
import { Building2, FileText, ArrowUpRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContentIndexPage() {
  // Which pages have actually been customised, so the list can show at a glance
  // what's been changed versus what's still the original wording.
  const [edited, businessCount] = await Promise.all([
    prisma.pageContent.findMany({ select: { pageKey: true, updatedAt: true } }),
    prisma.siteSetting.count(),
  ]);
  const editedMap = new Map(edited.map((e) => [e.pageKey, e.updatedAt]));

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Site Content</h1>
        <p className="mt-1 text-sm text-ink/70">
          Edit the wording, images and business details on your public pages. The design stays exactly as it is — only the content changes.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Business Information</h2>
        <Link
          href="/admin/content/business"
          className="group flex items-center gap-4 rounded-xl2 border border-border-soft/80 bg-white p-5 shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-0.5 hover:border-rose-gold/30 hover:shadow-e3"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-gold to-rose-gold-light text-white shadow-e1">
            <Building2 size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Contact details, address & social links</p>
            <p className="mt-0.5 text-xs text-ink/70">
              Your phone number, email, address and opening hours — used in the footer, the Contact page and the WhatsApp button.
            </p>
          </div>
          {businessCount > 0 && (
            <span className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-success sm:flex">
              <CheckCircle2 size={12} /> Customised
            </span>
          )}
          <ArrowUpRight size={15} className="shrink-0 text-ink/25 transition-all group-hover:text-rose-gold" />
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">Pages</h2>
        <div className="space-y-3">
          {PAGE_DEFS.map((page) => {
            const updated = editedMap.get(page.key);
            return (
              <Link
                key={page.key}
                href={`/admin/content/${page.key}`}
                className="group flex items-center gap-4 rounded-xl2 border border-border-soft/80 bg-white p-5 shadow-e1 transition-all duration-300 ease-silk hover:-translate-y-0.5 hover:border-rose-gold/30 hover:shadow-e3"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-gold/10 text-rose-gold">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{page.label}</p>
                  <p className="mt-0.5 text-xs text-ink/70">{page.description}</p>
                </div>
                {updated && (
                  <span className="hidden shrink-0 text-[11px] text-ink/35 sm:block">
                    Edited {new Date(updated).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                  </span>
                )}
                <ArrowUpRight size={15} className="shrink-0 text-ink/25 transition-all group-hover:text-rose-gold" />
              </Link>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-ink/70">
        Looking for the homepage? Its sections are managed separately under{" "}
        <Link href="/admin/homepage" className="text-rose-gold hover:underline">Homepage</Link>. Products, brands and
        blog posts are edited from their own sections.
      </p>
    </div>
  );
}
