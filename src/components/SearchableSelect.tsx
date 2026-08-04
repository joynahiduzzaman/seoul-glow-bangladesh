"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, Loader2, MapPin } from "lucide-react";

export interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (id: string, option: SearchableSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  disabledMessage?: string;
  loading?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
}

/** Highlights the first case-insensitive match of `query` inside `label` —
 * used so a typed "nar" visibly bolds the "Nar" in "Narail"/"Narayanganj"
 * rather than just silently filtering the list. */
function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{label}</>;
  const idx = label.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-rose-gold/25 text-ink rounded-sm">{label.slice(idx, idx + trimmed.length)}</mark>
      {label.slice(idx + trimmed.length)}
    </>
  );
}

/**
 * Generic searchable combobox (district/upazila pickers, and reusable anywhere
 * else a long option list needs type-to-filter instead of a native <select>).
 * Fully keyboard-navigable (Arrow keys, Enter, Escape) and closes on outside
 * click. Data-agnostic — callers pass {id, label} options, so this component
 * has zero knowledge of Bangladesh geography or anything else domain-specific.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyMessage = "No matches found",
  disabled = false,
  disabledMessage,
  loading = false,
  label,
  required = false,
  error,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.id === value) || null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Autofocus the search input the moment the dropdown opens, so typing
      // works immediately without an extra click — matches Daraz/Shopify UX.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
  }

  function selectOption(option: SearchableSelectOption) {
    onChange(option.id, option);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) selectOption(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const showDisabledState = disabled && disabledMessage;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-ink/70 mb-1.5">
          {label} {required && <span className="text-rose-gold">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-left transition-all duration-200 ${
          disabled ? "bg-beige/40 text-ink/30 cursor-not-allowed border-border-soft" : "bg-white border-border-soft hover:border-ink/20"
        } ${open ? "border-rose-gold ring-4 ring-rose-gold/10" : ""} ${error ? "border-badge-sale" : ""}`}
      >
        <MapPin size={15} className={selected ? "text-rose-gold shrink-0" : "text-ink/25 shrink-0"} />
        <span className={`flex-1 truncate ${selected ? "text-ink" : "text-ink/35"}`}>
          {showDisabledState ? disabledMessage : selected ? selected.label : placeholder}
        </span>
        {loading ? (
          <Loader2 size={15} className="animate-spin text-ink/30 shrink-0" />
        ) : (
          <ChevronDown size={15} className={`text-ink/30 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-30 mt-1.5 w-full bg-white rounded-xl shadow-e3 border border-ink/10 overflow-hidden"
          >
            <div className="relative border-b border-ink/10 p-2">
              <Search size={14} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
              />
            </div>

            {loading ? (
              <div className="p-6 flex justify-center">
                <Loader2 size={18} className="animate-spin text-ink/30" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-ink/70 text-center py-6 px-4">{emptyMessage}</p>
            ) : (
              <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
                {filtered.map((option, i) => (
                  <li key={option.id} data-index={i}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => selectOption(option)}
                      className={`w-full flex flex-col items-start px-4 py-2.5 text-left text-sm transition-colors ${
                        i === activeIndex ? "bg-soft-pink/20" : ""
                      } ${option.id === value ? "font-medium text-rose-gold-text" : "text-ink"}`}
                    >
                      <span>
                        <HighlightedLabel label={option.label} query={query} />
                      </span>
                      {option.sublabel && <span className="text-[11px] text-ink/70">{option.sublabel}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
