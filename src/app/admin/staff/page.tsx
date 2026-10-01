import Link from "next/link";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { ShieldAlert } from "lucide-react";
import StaffTableClient, { type StaffRow } from "@/components/admin/StaffTableClient";
import { STAFF_ROLE_VALUES, STAFF_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getCurrentUser();

  /**
   * Middleware lets any of the three roles into /admin, so this page has to
   * make the admin-only decision itself. A manager who guesses the URL gets
   * this panel, not the staff list — and the API behind it refuses them too,
   * so neither layer depends on the other being right.
   */
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-md rounded-xl2 border border-border-soft bg-white p-10 text-center shadow-soft">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          <ShieldAlert size={22} />
        </span>
        <h1 className="font-display text-xl font-semibold">Admins only</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink/65">
          Managing who can sign in is restricted to admin accounts. Ask an admin if you need access
          changed.
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-block rounded-lg bg-rose-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B27878]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const rows = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLE_VALUES] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { createdOrders: true, assignedOrders: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const staff: StaffRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    ordersRecorded: r._count.createdOrders,
    ordersAssigned: r._count.assignedOrders,
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">Staff</h1>
        <p className="mt-1 text-sm text-ink/70">
          Who can sign in to this panel, and how much of it they can see.
        </p>
      </div>

      <StaffTableClient staff={staff} currentUserId={user.id} />

      {/* The permission model, stated once where the decision is made. Without
          it an owner picking a role is guessing, and the likeliest guess —
          "staff is a smaller admin" — gets the money question wrong. */}
      <section className="rounded-xl2 border border-border-soft bg-white p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-semibold">What each role can reach</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STAFF_ROLES.map((r) => (
            <div key={r.value} className="rounded-xl border border-border-soft/70 bg-cream/40 p-4">
              <p className="font-display text-base font-semibold">{r.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{r.summary}</p>
              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed">
                {r.can.map((c) => (
                  <li key={c} className="flex gap-1.5 text-ink/75">
                    <span className="shrink-0 text-success">✓</span> {c}
                  </li>
                ))}
                {r.cannot.map((c) => (
                  <li key={c} className="flex gap-1.5 text-ink/50">
                    <span className="shrink-0 text-badge-sale">✕</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink/55">
          Removing access demotes the account to a normal customer rather than deleting it, so the orders
          they recorded and the payments they verified keep their names attached. Access can be given back
          from this screen at any time.
        </p>
      </section>
    </div>
  );
}
