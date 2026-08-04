"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Admin search field — Stripe/Shopify-style: a soft inset surface that lifts to
 * a focused white card with a rose focus ring, an inline clear button once
 * there's a query, and a ⌘K / Ctrl-K shortcut hint that actually focuses the
 * field.
 *
 * Purely presentational over a plain <input name>: the surrounding <form> still
 * does a normal GET submit, so search keeps working exactly as before (and with
 * JS disabled) — only the styling and the keyboard shortcut are new.
 */
export default function AdminSearchInput({
  name = "q",
  defaultValue = "",
  placeholder = "Search…",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    // Outer wrapper is the gradient ring itself; the inner div carries the solid
    // surface so the gradient only ever shows as a 1.5px edge.
    <div
      className={`gradient-ring rounded-xl transition-shadow duration-300 ease-silk ${
        focused ? "gradient-ring-active shadow-e2" : "hover:opacity-70"
      }`}
    >
      <div className="group relative flex items-center rounded-[10.5px] bg-white">
        <Search
          size={15}
          className={`pointer-events-none absolute left-3.5 transition-colors duration-200 ${focused ? "text-rose-gold" : "text-ink/35"}`}
        />
        <input
          ref={inputRef}
          type="search"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          // Native search inputs render a UA clear button in some browsers; hidden
          // so it never sits next to our own clear affordance.
          className="w-full rounded-[10.5px] bg-transparent py-2.5 pl-9 pr-20 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink/35 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
          {!value && !focused && (
            <kbd className="hidden select-none items-center gap-0.5 rounded-md border border-border-soft bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink/35 sm:inline-flex">
              ⌘K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
