"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-full bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-ink/90 transition-colors"
    >
      <Printer size={15} /> {label}
    </button>
  );
}
