import { getAllHomepageSections } from "@/server/homepage";
import HomepageBuilderClient from "@/components/admin/HomepageBuilderClient";

export const dynamic = "force-dynamic";

export default async function AdminHomepageBuilderPage() {
  const sections = await getAllHomepageSections();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-1">Homepage Builder</h1>
      <p className="text-sm text-ink/70 mb-6">Reorder, enable, disable, and edit every homepage section — no code changes needed.</p>
      <HomepageBuilderClient
        initialSections={sections.map((s) => ({
          id: s.id,
          sectionKey: s.sectionKey,
          title: s.title,
          settings: s.settings,
          enabled: s.enabled,
          status: s.status,
          publishAt: s.publishAt ? s.publishAt.toISOString() : null,
          unpublishAt: s.unpublishAt ? s.unpublishAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
