import RichText from "./RichText";

/** Shared layout for the numbered legal pages (Terms, Privacy Policy) — same
 * sticky table of contents and section rhythm, driven entirely by content so
 * both pages stay identical in design while their wording is edited freely. */
export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
}) {
  // Anchor ids are derived from the section title so the table of contents keeps
  // working when an admin renames, reorders, adds or removes a section.
  const withIds = sections.map((s, i) => ({
    ...s,
    id: (s.title || `section-${i + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || `section-${i + 1}`,
  }));

  return (
    <div className="container-px mx-auto section-py">
      <div className="max-w-lg mb-14">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-text font-semibold mb-4">{eyebrow}</p>
        <h1 className="section-title mb-4">{title}</h1>
        <p className="text-body text-sm">{intro}</p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-12">
        {/* Sidebar navigation — sticky, no JS required */}
        <nav className="hidden md:block sticky top-28 self-start">
          <p className="text-xs uppercase tracking-wide text-ink/70 mb-3">On this page</p>
          <ul className="space-y-2.5 text-sm border-l border-border-soft">
            {withIds.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block pl-4 -ml-px border-l border-transparent hover:border-rose-gold text-ink/70 hover:text-rose-gold transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl space-y-10">
          {withIds.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-display text-xl font-semibold mb-3 text-ink">{s.title}</h2>
              <RichText value={s.body} className="text-sm text-body leading-relaxed" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
