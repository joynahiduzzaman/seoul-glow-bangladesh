"use client";

import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl2 shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-start justify-between mb-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${danger ? "bg-badge-sale/10 text-badge-sale" : "bg-rose-gold/10 text-rose-gold"}`}>
            <AlertTriangle size={18} />
          </span>
          <button onClick={onCancel} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={18} /></button>
        </div>
        <h3 className="font-display text-lg mb-1.5">{title}</h3>
        <p className="text-sm text-ink/70 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-ink/10 py-2.5 text-sm font-medium hover:bg-beige/60 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              danger ? "bg-badge-sale hover:bg-badge-sale/90" : "bg-rose-gold hover:bg-[#B27878]"
            }`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
