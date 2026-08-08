"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
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
      const data = await res.json().catch(() => ({}));
      // The route sends back why it refused — "Enter a valid email", or the
      // rate-limit message. Showing "Something went wrong" for all of them
      // leaves someone retyping a perfectly good address.
      if (!res.ok) throw new Error(data.error);
      toast.success(data.alreadySubscribed ? "You're already on the glow list ✨" : "Subscribed! Welcome to the glow list ✨");
      setEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
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
            {/* 80 rather than 70: the copy has to clear 4.5:1 over whatever
                photo an admin uploads, not just over a convenient one. */}
            <div className="absolute inset-0 bg-ink/80 -z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-ink -z-10" style={backgroundColor ? { backgroundColor } : undefined} />
        )}

        <h2 className="font-display text-3xl md:text-4xl mb-3">{title || dict.home.newsletterTitle}</h2>
        <p className="text-cream/70 max-w-md mx-auto mb-7 text-sm leading-relaxed sm:text-[15px]">
          {subtitle || dict.home.newsletterDesc}
        </p>
        {/* Stacked below 640px. Side by side, the input's intrinsic minimum
            width plus the button came to ~355px against a content box of 216px
            at 320px wide — so the Subscribe button was pushed out of the card
            and clipped by its own overflow-hidden on every common phone. The
            min-w-0 keeps the input shrinkable at every width above that, which
            is what the flexbox default of min-width:auto was preventing.

            The input takes flex-1 only from sm up: in the stacked layout the
            main axis is vertical, and flex-basis:0 there beats h-12 and
            collapses the field to 17px. */}
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:gap-2">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="h-12 w-full min-w-0 rounded-full bg-white px-5 text-sm text-ink outline-none sm:flex-1
                       placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-rose-gold
                       focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          />
          <button
            disabled={loading}
            className="btn-primary w-full shrink-0 !rounded-full !px-7 sm:w-auto"
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {loading ? "Subscribing…" : buttonText || dict.home.subscribe}
          </button>
        </form>
      </div>
    </section>
  );
}
