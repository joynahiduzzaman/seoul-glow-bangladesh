"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, GitCompare } from "lucide-react";
import { useCompareStore, MAX_COMPARE_ITEMS } from "@/lib/compare-store";

/** Floating compare tray — bottom-LEFT rather than bottom-right, since the cart
 * drawer trigger, WhatsApp bubble, and back-to-top button already stack there;
 * this way none of the persistent floating actions ever compete for the same
 * corner. Only ever mounted (via AnimatePresence) once at least one item is
 * selected, so it never occupies space or attention on an ordinary browse. */
export default function CompareBar() {
  const items = useCompareStore((s) => s.items);
  const removeItem = useCompareStore((s) => s.removeItem);
  const clear = useCompareStore((s) => s.clear);

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed z-40 flex items-center gap-3 rounded-full bg-ink text-cream shadow-e4 pl-3 pr-2 py-2"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))", left: "calc(1.5rem + env(safe-area-inset-left, 0px))" }}
        >
          <div className="flex -space-x-2.5">
            {items.map((item) => (
              <button
                key={item.productId}
                onClick={() => removeItem(item.productId)}
                aria-label={`Remove ${item.name} from comparison`}
                className="group relative h-9 w-9 rounded-full ring-2 ring-ink overflow-hidden bg-beige shrink-0"
              >
                {item.image && <Image src={item.image} alt={item.name} fill sizes="36px" className="object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={13} className="text-cream" />
                </span>
              </button>
            ))}
          </div>

          <span className="hidden sm:inline text-xs text-cream/60 whitespace-nowrap">
            {items.length}/{MAX_COMPARE_ITEMS} selected
          </span>

          <Link
            href="/compare"
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              items.length >= 2 ? "bg-rose-gold text-white hover:bg-[#B27878]" : "bg-cream/10 text-cream/55 pointer-events-none"
            }`}
            aria-disabled={items.length < 2}
          >
            <GitCompare size={14} /> Compare
          </Link>

          <button
            onClick={clear}
            aria-label="Clear comparison"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-cream/55 hover:bg-white/10 hover:text-cream transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
