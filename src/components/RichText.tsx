import Link from "next/link";

/**
 * Renders admin-authored body copy that may contain markdown-style links:
 * `[label](/shipping-policy)`.
 *
 * Links are the ONLY markup supported, and the href is validated against a
 * strict allowlist (site-relative, http, https, mailto, tel). Admin-entered
 * text is untrusted input rendered on a public page — accepting raw HTML here,
 * or passing an unchecked href straight through, would turn a content field
 * into a stored-XSS vector (`javascript:` URLs being the classic case).
 */
// Links inside a paragraph are ALWAYS underlined, not just on hover. WCAG
// requires an inline link to be distinguishable from its surrounding text by
// something other than colour alone (or to clear 3:1 against that text) — a
// hover-only underline fails for anyone not using a mouse.
function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return true;
  return /^(https?:|mailto:|tel:)/i.test(href);
}

export default function RichText({ value, className }: { value: string; className?: string }) {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index));

    const [full, label, href] = match;
    if (!isSafeHref(href)) {
      // Unsafe scheme — keep the author's text visible, drop the link.
      nodes.push(label);
    } else if (href.startsWith("/")) {
      nodes.push(
        <Link key={key++} href={href} className="text-rose-gold-text underline underline-offset-2 hover:text-rose-gold">
          {label}
        </Link>
      );
    } else {
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="text-rose-gold-text underline underline-offset-2 hover:text-rose-gold">
          {label}
        </a>
      );
    }
    lastIndex = match.index + full.length;
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));

  return <p className={className}>{nodes}</p>;
}
