"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Dictionary } from "@/lib/i18n/dictionaries";

export default function Newsletter({
  dict,
  title,
  subtitle,
  buttonText,
  backgroundImage,
  backgroundColor,
}: {
  dict: Dictionary;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  backgroundImage?: string;
  backgroundColor?: string;
}) {
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
    <section className="container-px mx-auto section-py">
      <div className="relative overflow-hidden rounded-xl2 text-cream px-8 py-14 text-center">
        {backgroundImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover -z-10" />
            <div className="absolute inset-0 bg-ink/70 -z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-ink -z-10" style={backgroundColor ? { backgroundColor } : undefined} />
        )}

        <h2 className="font-display text-3xl md:text-4xl mb-3">{title || dict.home.newsletterTitle}</h2>
        <p className="text-cream/60 max-w-md mx-auto mb-6">{subtitle || dict.home.newsletterDesc}</p>
        <form onSubmit={handleSubmit} className="flex max-w-md mx-auto gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-full px-5 py-3 text-ink text-sm outline-none"
          />
          <button disabled={loading} className="btn-primary !px-6">
            {loading ? "..." : buttonText || dict.home.subscribe}
          </button>
        </form>
      </div>
    </section>
  );
}
