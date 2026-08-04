import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ContentEditor from "@/components/admin/ContentEditor";
import { BUSINESS_FIELDS, getPageDef } from "@/lib/site-content";
import { getBusinessInfo, getPageContent } from "@/server/content";

export const dynamic = "force-dynamic";

export default async function ContentEditPage({ params }: { params: { key: string } }) {
  const isBusiness = params.key === "business";
  const def = isBusiness ? null : getPageDef(params.key);
  if (!isBusiness && !def) return notFound();

  // Both editors are fed pre-merged values (saved layered over defaults), so the
  // form always opens showing exactly what the live page currently renders.
  const values = isBusiness ? await getBusinessInfo() : await getPageContent(params.key);

  return (
    <div>
      <Link
        href="/admin/content"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink/70 transition-colors hover:text-rose-gold-text"
      >
        <ChevronLeft size={14} /> Back to Site Content
      </Link>

      <ContentEditor
        target={isBusiness ? "business" : def!.key}
        title={isBusiness ? "Business Information" : def!.label}
        description={
          isBusiness
            ? "Used across the footer, the Contact page and the floating WhatsApp button."
            : def!.description
        }
        livePath={isBusiness ? "/contact" : def!.path}
        groups={isBusiness ? BUSINESS_FIELDS : def!.groups}
        initialValues={values}
      />
    </div>
  );
}
