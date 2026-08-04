"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name, phone, currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Profile updated");
      setForm({ ...form, currentPassword: "", newPassword: "" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-ink/70 mb-1 block">Email (cannot be changed)</label>
        <input disabled value={email} className="w-full rounded-lg border border-ink/10 bg-beige/40 px-4 py-2.5 text-sm text-ink/70" />
      </div>
      <div>
        <label className="text-xs text-ink/70 mb-1 block">Full Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
      </div>
      <div>
        <label className="text-xs text-ink/70 mb-1 block">Phone Number</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
      </div>

      <div className="border-t border-ink/10 pt-4">
        <p className="text-sm font-medium mb-3">Change Password (optional)</p>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
          <input type="password" placeholder="New password (min. 6 characters)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className="w-full rounded-lg border border-ink/10 px-4 py-2.5 text-sm" />
        </div>
      </div>

      <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : "Save Changes"}</button>
    </form>
  );
}
