"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import PasswordField from "@/components/PasswordField";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password reset! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container-px mx-auto py-24 text-center">
        <h1 className="font-display text-2xl mb-3">Invalid Reset Link</h1>
        <Link href="/forgot-password" className="text-rose-gold underline">Request a new one</Link>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto py-16 flex justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={64} height={64} className="rounded-full mb-3" />
          <h1 className="font-display text-2xl font-semibold">Set a New Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            required
            minLength={6}
            placeholder="New password (min. 6 characters)"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
          <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : "Reset Password"}</button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-px mx-auto py-24 text-center text-ink/70">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
