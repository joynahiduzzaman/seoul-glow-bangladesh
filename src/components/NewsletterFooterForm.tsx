"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";
import { Dictionary } from "@/lib/i18n/dictionaries";

export default function NewsletterFooterForm({ dict }: { dict: Dictionary }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toast.success("Subscribed! Welcome to the glow list ✨");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center border-b border-cream/25 focus-within:border-rose-gold-light transition-colors pb-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        // min-w-0 is required: a flex child defaults to min-width:auto, so the
        // input's intrinsic size stopped it shrinking and pushed the footer
        // wider than the viewport at tablet widths.
        className="min-w-0 flex-1 bg-transparent text-cream placeholder:text-cream/55 text-sm outline-none"
      />
      <button disabled={loading} aria-label={dict.home.subscribe} className="text-cream hover:text-rose-gold-light transition-colors disabled:opacity-40">
        {loading ? "…" : <ArrowRight size={18} />}
      </button>
    </form>
  );
}
