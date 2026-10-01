"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, UserMinus, Plus, Users } from "lucide-react";
import { roleLabel, roleDefinition } from "@/lib/roles";
import StaffFormModal, { type EditingStaff } from "./StaffFormModal";
import ConfirmDialog from "./ConfirmDialog";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  ordersRecorded: number;
  ordersAssigned: number;
}

const ROLE_CHIP: Record<string, string> = {
  ADMIN: "bg-badge-onetwo/10 text-badge-onetwo",
  MANAGER: "bg-rose-gold/10 text-rose-gold-text",
  STAFF: "bg-badge-coupon/10 text-badge-coupon",
};

export default function StaffTableClient({
  staff,
  currentUserId,
}: {
  staff: StaffRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingStaff | null | "new">(null);
  const [revoking, setRevoking] = useState<StaffRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRevoke() {
    if (!revoking) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${revoking.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove access");
      toast.success(`${revoking.name} no longer has access`);
      setRevoking(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove access");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">
          {staff.length} {staff.length === 1 ? "person" : "people"} with access
        </h2>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white shadow-e1 transition-all hover:bg-[#B27878] hover:shadow-e3"
        >
          <Plus size={16} />
          Add staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-xl2 border border-border-soft bg-white p-12 text-center shadow-soft">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-gold/10 text-rose-gold">
            <Users size={22} />
          </span>
          <h3 className="font-display text-lg">No staff accounts yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
            Add someone so they can handle orders without using your own login.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border-soft bg-cream/50 text-left text-[11px] uppercase tracking-[0.12em] text-ink/60">
                  <th className="px-4 py-3 font-semibold">Person</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders handled</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const isSelf = s.id === currentUserId;
                  const def = roleDefinition(s.role);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border-soft/60 transition-colors last:border-0 hover:bg-cream/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {s.name}
                          {isSelf && <span className="ml-2 text-[10px] font-normal text-ink/45">you</span>}
                        </p>
                        <p className="truncate text-xs text-ink/55">
                          {s.email}
                          {s.phone && ` · ${s.phone}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={def?.summary}
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            ROLE_CHIP[s.role] ?? "bg-ink/5 text-ink/60"
                          }`}
                        >
                          {roleLabel(s.role)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink/70">
                        {s.ordersRecorded + s.ordersAssigned}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              setEditing({ id: s.id, name: s.name, email: s.email, role: s.role, isSelf })
                            }
                            aria-label={`Change access for ${s.name}`}
                            title="Change role or reset password"
                            className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            onClick={() => setRevoking(s)}
                            disabled={isSelf}
                            aria-label={`Remove access for ${s.name}`}
                            title={isSelf ? "You can't remove your own access" : "Remove access"}
                            className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-badge-sale/10 hover:text-badge-sale disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink/50"
                          >
                            <UserMinus size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StaffFormModal editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={revoking !== null}
        title="Remove admin access?"
        message={
          revoking
            ? `${revoking.name} will no longer be able to open the admin panel. Their account and everything they've already done — orders recorded, payments verified — stays exactly as it is, and you can give access back at any time.`
            : ""
        }
        confirmLabel="Remove access"
        loading={busy}
        onConfirm={handleRevoke}
        onCancel={() => setRevoking(null)}
      />
    </>
  );
}
