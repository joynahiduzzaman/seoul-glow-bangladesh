"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowRight } from "lucide-react";

export interface MegaMenuLink {
  label: string;
  href: string;
}

export interface MegaMenuProps {
  label: string;
  triggerHref: string;
  links: MegaMenuLink[];
  image: string;
  caption: string;
  ctaLabel: string;
  ctaHref: string;
}

/**
 * Hover-triggered desktop dropdown. Deliberately built with plain CSS transitions
 * (opacity/translate via Tailwind classes) rather than an animation library — this sits
 * in primary navigation, used on every page, so it stays maximally dependency-light and
 * predictable. A small close-delay (via timeout) avoids it snapping shut if the cursor
 * briefly leaves the trigger while moving toward the panel.
 */
export default function MegaMenu({ label, triggerHref, links, image, caption, ctaLabel, ctaHref }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href={triggerHref}
        className="relative text-sm font-medium text-ink/80 hover:text-rose-gold-text transition-colors py-2 group"
      >
        {label}
        <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-rose-gold transition-all duration-300 group-hover:w-full" />
      </Link>

      <div
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="w-[420px] rounded-xl2 bg-white shadow-e4 ring-1 ring-ink/5 overflow-hidden grid grid-cols-2">
          <div className="p-6">
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink/70 hover:text-rose-gold-text transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {/* mt-5 only when there is a list above it to be spaced from: the
                links are read from the catalogue now, so an empty shop gets a
                panel that is just the caption and this button. */}
            <Link
              href={ctaHref}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold text-rose-gold-text hover:gap-2.5 transition-all ${
                links.length > 0 ? "mt-5" : ""
              }`}
            >
              {ctaLabel} <ArrowRight size={13} />
            </Link>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            <p className="absolute bottom-4 left-4 right-4 text-xs text-white font-medium leading-snug">{caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
