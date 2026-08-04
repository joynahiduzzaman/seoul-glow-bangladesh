"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Wraps the exact same filter JSX the desktop sidebar already renders (passed in
 * as children) inside a mobile bottom-sheet — no filter logic is duplicated, this
 * is purely a different container for the same Category/Brand/Price links.
 * Desktop is untouched: this component renders nothing above the md breakpoint.
 */
export default function MobileFilterDrawer({ children, activeCount, resultCount }: { children: React.ReactNode; activeCount: number; resultCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        // `lg:hidden`, matching the point at which the shop's filter sidebar
        // appears. These two must stay in step: if the drawer hid at `md` while
        // the sidebar only appeared at `lg`, everything from 768–1023px would
        // have no way to filter at all.
        className="lg:hidden inline-flex items-center gap-1.5 text-xs font-medium rounded-full border border-ink/15 px-4 py-2.5 touch-target !h-auto"
      >
        <SlidersHorizontal size={14} />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-h-[85vh] bg-cream rounded-t-2xl shadow-e4 flex flex-col safe-bottom">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft shrink-0">
              <h2 className="font-display text-lg">Filters</h2>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="touch-target text-ink/70 hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 space-y-8">{children}</div>
            <div className="px-5 py-4 border-t border-border-soft shrink-0">
              <button onClick={() => setOpen(false)} className="btn-primary w-full">
                Show {resultCount} {resultCount === 1 ? "Result" : "Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
