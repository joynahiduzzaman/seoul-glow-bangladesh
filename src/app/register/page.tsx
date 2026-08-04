"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/use-locale";
import { safeRedirectPath } from "@/lib/utils";
import SocialLoginButtons from "@/components/SocialLoginButtons";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { dict } = useLocale();

  // Mirrors the login page: lets checkout (and anywhere else) send someone here with
  // ?redirect=/checkout and get them back to exactly where they were, cart intact.
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));
  const loginHref = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const refMatch = document.cookie.match(/(?:^|; )ref=([^;]+)/);
      const referralCode = refMatch ? decodeURIComponent(refMatch[1]) : undefined;
      // The phone field is entered without the country code (matches the +880 prefix
      // shown next to the input); only combine them if something was actually typed.
      const phone = form.phone.trim() ? `+880${form.phone.trim()}` : undefined;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Account created! Welcome to Seoul Glow.");
      // Same priority as login: an explicit ?redirect= wins, otherwise land on the
      // account dashboard rather than the homepage — registration is never staff,
      // so there's no admin branch to consider here.
      router.push(redirectTo || "/account");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-px mx-auto py-10 md:py-16 flex justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={64} height={64} className="rounded-full mb-3" />
          <h1 className="font-display text-2xl font-semibold">{dict.auth.createAccount}</h1>
          <p className="text-sm text-ink/70">{dict.auth.registerDesc}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
          <input type="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />

          {/* Phone with a fixed +880 (Bangladesh) prefix, like the reference design —
              optional today, but this is also what a future phone-login would key off. */}
          <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
            <span className="flex items-center border-r border-border-soft bg-beige/60 px-4 text-sm text-ink/70 shrink-0">+880</span>
            <input
              type="tel"
              placeholder={`${dict.auth.phoneNumber} (optional)`}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              className="w-full min-w-0 bg-transparent px-4 py-3 text-sm placeholder:text-ink/35 focus:outline-none"
            />
          </div>

          <input type="password" required minLength={6} placeholder="Password (min. 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field" />
          <button disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? dict.auth.signingIn : dict.auth.createAccount}
          </button>
        </form>
        <p className="text-center text-sm text-ink/70 mt-6">
          {dict.auth.haveAccount} <Link href={loginHref} className="text-rose-gold-text font-medium">{dict.auth.signIn}</Link>
        </p>

        <SocialLoginButtons dict={dict} redirectTo={redirectTo || undefined} />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="container-px mx-auto py-24 text-center text-ink/70">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
