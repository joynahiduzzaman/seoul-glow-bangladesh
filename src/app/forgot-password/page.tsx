"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-px mx-auto py-10 md:py-16 flex justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={64} height={64} className="rounded-full mb-3" />
          <h1 className="font-display text-2xl font-semibold">Forgot Password</h1>
          <p className="text-sm text-ink/70 text-center">Enter your email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <div className="text-center bg-beige/60 rounded-xl p-6 text-sm text-ink/70">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
            <button disabled={loading} className="btn-primary w-full">{loading ? "Sending…" : "Send Reset Link"}</button>
          </form>
        )}

        <p className="text-center text-sm text-ink/70 mt-6">
          <Link href="/login" className="text-rose-gold-text font-medium">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
