"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { STAFF_ROLES, roleDefinition } from "@/lib/roles";

export interface EditingStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  isSelf: boolean;
}

const FIELD =
  "w-full rounded-lg border border-ink/10 bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-rose-gold/50 focus:outline-none focus:ring-2 focus:ring-rose-gold/15";

export default function StaffFormModal({
  editing,
  onClose,
}: {
  editing: EditingStaff | null | "new";
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = editing !== null && editing !== "new";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing && editing !== "new") {
      setName(editing.name);
      setEmail(editing.email);
      setRole(editing.role);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("STAFF");
    }
    setPassword("");
  }, [editing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (editing === null) return null;

  const selected = roleDefinition(role);
  const self = isEdit && (editing as EditingStaff).isSelf;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/admin/staff/${(editing as EditingStaff).id}` : "/api/admin/staff";
      const payload = isEdit
        ? {
            // Own role is never sent: the API refuses it, and offering it in the
            // UI only to be rejected would be a worse experience than not
            // offering it at all.
            ...(self ? {} : { role }),
            ...(password ? { password } : {}),
          }
        : { name, email, phone: phone.trim() || null, password, role };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      toast.success(isEdit ? "Updated" : `${name} can now sign in`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit access" : "Add a staff member"}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl2 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {isEdit ? `Access for ${(editing as EditingStaff).name}` : "Add a staff member"}
            </h3>
            <p className="mt-0.5 text-xs text-ink/60">
              {isEdit
                ? "Change what they can reach, or set a new password."
                : "They'll sign in at /login with this email and password."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {!isEdit && (
            <>
              <div>
                <label htmlFor="st-name" className="mb-1.5 block text-xs font-medium text-ink/70">
                  Name
                </label>
                <input id="st-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="st-email" className="mb-1.5 block text-xs font-medium text-ink/70">
                  Email
                </label>
                <input id="st-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="st-phone" className="mb-1.5 block text-xs font-medium text-ink/70">
                  Phone <span className="font-normal text-ink/40">(optional)</span>
                </label>
                <input id="st-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className={FIELD} />
              </div>
            </>
          )}

          <div>
            <label htmlFor="st-password" className="mb-1.5 block text-xs font-medium text-ink/70">
              {isEdit ? "New password " : "Password"}
              {isEdit && <span className="font-normal text-ink/40">(leave blank to keep the current one)</span>}
            </label>
            <input
              id="st-password"
              required={!isEdit}
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={FIELD}
            />
            <p className="mt-1.5 text-xs text-ink/55">
              Share it with them directly and ask them to change it after signing in.
            </p>
          </div>

          <div>
            <label htmlFor="st-role" className="mb-1.5 block text-xs font-medium text-ink/70">
              Role
            </label>
            <select
              id="st-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={self}
              className={`${FIELD} disabled:cursor-not-allowed disabled:bg-ink/[0.03] disabled:text-ink/50`}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.summary}
                </option>
              ))}
            </select>
            {self && (
              <p className="mt-1.5 text-xs text-ink/55">
                You can&apos;t change your own role. Another admin has to do it.
              </p>
            )}
          </div>

          {/* What the choice actually means, read off the real API guards — so
              an owner granting access knows whether this person will see costs. */}
          {selected && (
            <div className="rounded-lg border border-border-soft bg-cream/50 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
                <ShieldCheck size={13} className="text-rose-gold" />
                A {selected.label.toLowerCase()} can
              </p>
              <ul className="space-y-1 text-xs leading-relaxed text-ink/70">
                {selected.can.map((c) => (
                  <li key={c} className="flex gap-1.5">
                    <span className="text-success">✓</span> {c}
                  </li>
                ))}
                {selected.cannot.map((c) => (
                  <li key={c} className="flex gap-1.5 text-ink/50">
                    <span className="text-badge-sale">✕</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-ink/10 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/[0.03]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white shadow-e1 transition-all hover:bg-[#B27878] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
