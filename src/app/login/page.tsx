"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/use-locale";
import { safeRedirectPath } from "@/lib/utils";
import SocialLoginButtons from "@/components/SocialLoginButtons";

type Tab = "email" | "phone";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { dict } = useLocale();

  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  // Surfaces errors bounced back from the OAuth callback (e.g. "not connected yet")
  // as a toast instead of a raw query string.
  useEffect(() => {
    const oauthError = searchParams.get("oauthError");
    if (oauthError) toast.error(oauthError);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Phone is stored as +880XXXXXXXXXX (see register page) — apply the same prefix
      // here so a phone-tab login actually matches what's in the database.
      const body =
        tab === "email"
          ? { email: identifier, password }
          : { phone: `+880${identifier.replace(/\D/g, "")}`, password };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Welcome back, ${data.user.name}!`);

      const isStaff = data.user.role === "ADMIN" || data.user.role === "MANAGER" || data.user.role === "STAFF";
      // Redirect priority: an explicit ?redirect= param always wins (e.g. checkout
      // sending someone here and back). With no param, customers land on their
      // account dashboard and staff land in the admin panel — neither goes to the
      // homepage anymore, since landing on "/" after deliberately logging in isn't
      // useful for either audience.
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push(isStaff ? "/admin" : "/account");
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-px mx-auto py-10 md:py-16 flex justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={64} height={64} className="rounded-full mb-3" />
          <h1 className="font-display text-2xl font-semibold">{dict.auth.welcomeBack}</h1>
          <p className="text-sm text-ink/70">{dict.auth.signInDesc}</p>
        </div>

        {/* Identifier tabs — same login logic underneath (email or phone + password),
            just letting the person pick which one they have handy. */}
        <div className="flex rounded-full bg-beige/60 p-1 mb-6 text-sm font-medium">
          {(["email", "phone"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setIdentifier("");
              }}
              className={`flex-1 rounded-full py-2 transition-colors ${
                tab === t ? "bg-white text-ink shadow-soft" : "text-ink/70"
              }`}
            >
              {t === "email" ? dict.auth.emailTab : dict.auth.phoneTab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "email" ? (
            <input
              type="email"
              required
              placeholder="Email address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field"
            />
          ) : (
            <div className="flex items-stretch overflow-hidden rounded-xl border border-border-soft bg-white transition-all duration-200 focus-within:border-rose-gold focus-within:ring-4 focus-within:ring-rose-gold/10">
              <span className="flex items-center border-r border-border-soft bg-beige/60 px-4 text-sm text-ink/70 shrink-0">+880</span>
              <input
                type="tel"
                required
                placeholder="1712345678"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ""))}
                className="w-full min-w-0 bg-transparent px-4 py-3 text-sm placeholder:text-ink/35 focus:outline-none"
              />
            </div>
          )}
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
          <div className="text-right -mt-2">
            <Link href="/forgot-password" className="text-xs text-rose-gold-text hover:underline">{dict.auth.forgotPassword}</Link>
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? dict.auth.signingIn : dict.auth.signIn}
          </button>
        </form>

        <p className="text-center text-sm text-ink/70 mt-6">
          {dict.auth.noAccount} <Link href="/register" className="text-rose-gold-text font-medium">{dict.auth.createOne}</Link>
        </p>

        <SocialLoginButtons dict={dict} redirectTo={redirectTo || undefined} />

        {/* Seed credentials are a local-development convenience only — printing
            working admin credentials on the public login page of a live store is
            both a security problem and the opposite of premium. Next inlines
            NODE_ENV at build time, so this block is stripped from the production
            bundle entirely rather than just hidden with CSS. */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 rounded-xl border border-border-soft bg-beige/60 p-4 text-xs text-ink/70">
            <strong className="text-ink/70">Demo accounts (dev only, from seed data):</strong>
            <br />Admin: seoulglow26@gmail.com
            <br />Customer: customer@example.com
            <br />
            <span className="text-ink/50">
              Passwords are generated per seed run and printed once by{" "}
              <code>npx prisma db seed</code>.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-px mx-auto py-24 text-center text-ink/70">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
