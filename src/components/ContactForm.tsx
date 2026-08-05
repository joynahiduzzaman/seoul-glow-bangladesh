"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 size={40} className="text-success mx-auto mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">Message sent</h3>
        <p className="text-sm text-body max-w-xs mx-auto">
          Thanks for reaching out — our team typically replies within a few hours during business hours.
        </p>
        <button onClick={() => setSent(false)} className="link-tap text-sm text-rose-gold-text hover:underline mt-6">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="relative">
          {/* id/htmlFor pairs are required here. These float visually but were
              not associated with their input, so a screen reader announced four
              unlabelled fields — axe flags this as critical. */}
          <input
            id="contact-name"
            required
            placeholder=" "
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="peer w-full rounded-xl border border-border-soft px-4 pt-5 pb-2 text-sm focus:border-rose-gold transition-colors"
          />
          <label htmlFor="contact-name" className="absolute left-4 top-1 text-[11px] text-ink/70 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1 peer-focus:text-[11px] transition-all pointer-events-none">
            Your name
          </label>
        </div>
        <div className="relative">
          <input
            id="contact-email"
            type="email"
            required
            placeholder=" "
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="peer w-full rounded-xl border border-border-soft px-4 pt-5 pb-2 text-sm focus:border-rose-gold transition-colors"
          />
          <label htmlFor="contact-email" className="absolute left-4 top-1 text-[11px] text-ink/70 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1 peer-focus:text-[11px] transition-all pointer-events-none">
            Your email
          </label>
        </div>
      </div>

      <div className="relative">
        <input
          id="contact-subject"
          required
          placeholder=" "
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="peer w-full rounded-xl border border-border-soft px-4 pt-5 pb-2 text-sm focus:border-rose-gold transition-colors"
        />
        <label htmlFor="contact-subject" className="absolute left-4 top-1 text-[11px] text-ink/70 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1 peer-focus:text-[11px] transition-all pointer-events-none">
          Subject
        </label>
      </div>

      <div className="relative">
        <textarea
          id="contact-message"
          required
          minLength={10}
          rows={5}
          placeholder=" "
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="peer w-full rounded-xl border border-border-soft px-4 pt-5 pb-2 text-sm focus:border-rose-gold transition-colors resize-none"
        />
        <label htmlFor="contact-message" className="absolute left-4 top-1 text-[11px] text-ink/70 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1 peer-focus:text-[11px] transition-all pointer-events-none">
          How can we help?
        </label>
      </div>

      <button disabled={loading} className="btn-primary w-full">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
        {loading ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
