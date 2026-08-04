"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Copy, Eye, Trash2 } from "lucide-react";

export default function ProductActionsMenu({
  slug,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  slug: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Product actions" className="text-ink/70 hover:text-ink p-1">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-ink/5 py-1 z-20 text-sm">
          <button onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-3.5 py-2 hover:bg-beige/60 text-left">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => { setOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-3.5 py-2 hover:bg-beige/60 text-left">
            <Copy size={13} /> Duplicate
          </button>
          <Link href={`/product/${slug}`} target="_blank" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3.5 py-2 hover:bg-beige/60">
            <Eye size={13} /> View
          </Link>
          <button onClick={() => { setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3.5 py-2 hover:bg-badge-sale/10 text-badge-sale text-left">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
