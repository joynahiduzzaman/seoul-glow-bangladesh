"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Eye, Printer, FileText } from "lucide-react";

export default function OrderActionsMenu({
  orderId,
  onView,
}: {
  orderId: string;
  onView: () => void;
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
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Order actions" className="text-ink/70 hover:text-ink p-1">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-ink/5 py-1 z-20 text-sm">
          <button onClick={() => { setOpen(false); onView(); }} className="flex w-full items-center gap-2 px-3.5 py-2 hover:bg-beige/60 text-left">
            <Eye size={13} /> View Details
          </button>
          <a
            href={`/admin-print/orders/${orderId}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 hover:bg-beige/60"
          >
            <FileText size={13} /> Print Invoice
          </a>
          <a
            href={`/admin-print/orders/${orderId}/packing-slip`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3.5 py-2 hover:bg-beige/60"
          >
            <Printer size={13} /> Print Packing Slip
          </a>
        </div>
      )}
    </div>
  );
}
