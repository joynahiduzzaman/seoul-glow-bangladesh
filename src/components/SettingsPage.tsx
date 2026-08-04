"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

export default function SettingsPage({ initialMarketingOptIn }: { initialMarketingOptIn: boolean }) {
  const router = useRouter();
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function togglePreference() {
    const next = !marketingOptIn;
    setMarketingOptIn(next);
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingOptIn: next }),
      });
      if (!res.ok) throw new Error();
      toast.success("Preferences updated");
    } catch {
      setMarketingOptIn(!next);
      toast.error("Failed to update preferences");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleDelete() {
    if (!password) {
      toast.error("Enter your password to confirm");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Your account has been deleted");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="font-display text-2xl mb-6">Settings</h2>

        <div className="card-surface p-6">
          <h3 className="font-medium text-sm mb-1">Email Preferences</h3>
          <p className="text-xs text-ink/70 mb-4">Control what emails you receive from Seoul Glow Bangladesh.</p>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">Marketing emails (flash sales, new arrivals, tips)</span>
            <button
              type="button"
              role="switch"
              aria-checked={marketingOptIn}
              onClick={togglePreference}
              disabled={savingPrefs}
              className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${marketingOptIn ? "bg-rose-gold" : "bg-ink/15"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${marketingOptIn ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </label>
          <p className="text-xs text-ink/35 mt-3">
            You'll always receive essential emails (order confirmations, password resets) regardless of this setting.
          </p>
        </div>
      </div>

      <div className="card-surface p-6 border border-red-200">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-sm text-red-600">Delete Account</h3>
            <p className="text-xs text-ink/70 mt-1">
              This permanently deletes your profile, wishlist, saved addresses, and notifications. Your order
              history is kept for our business records but will no longer be linked to your account. This cannot be undone.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button onClick={() => setConfirmOpen(true)} className="text-sm text-red-600 font-medium hover:underline">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Enter your password to confirm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn-outline !text-xs">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 text-white text-xs font-semibold py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
