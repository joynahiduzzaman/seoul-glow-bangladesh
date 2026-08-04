"use client";

import { useEffect, useState } from "react";
import { Copy, Ticket } from "lucide-react";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  expiresAt: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);

  useEffect(() => {
    fetch("/api/coupons/active")
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons))
      .catch(() => setCoupons([]));
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}"`);
  }

  return (
    <div>
      <p className="text-sm text-ink/70 mb-6">Apply these at checkout to save on your order.</p>

      {coupons === null ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-beige rounded-xl2" />
          <div className="h-20 bg-beige rounded-xl2" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-ink/70">No active coupons right now — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c.id} className="card-surface p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
                  <Ticket size={18} />
                </span>
                <div>
                  <p className="font-display text-lg tracking-wide">{c.code}</p>
                  <p className="text-xs text-ink/70">
                    {c.type === "PERCENT" ? `${c.value}% off` : `৳${c.value} off`}
                    {c.minSpend > 0 && ` · Min. spend ৳${c.minSpend}`}
                    {c.expiresAt && ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button onClick={() => copyCode(c.code)} className="btn-outline !py-2 !text-xs flex items-center gap-1.5 shrink-0">
                <Copy size={13} /> Copy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
