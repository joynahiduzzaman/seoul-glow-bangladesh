import LegalPage from "@/components/LegalPage";
import { getPageContent, text, rows } from "@/server/content";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPolicyPage() {
  const content = await getPageContent("privacy-policy");
  return (
    <LegalPage
      eyebrow={text(content, "eyebrow")}
      title={text(content, "title")}
      intro={text(content, "intro")}
      sections={rows(content, "sections").map((s) => ({ title: s.title || "", body: s.body || "" }))}
    />
  );
}
