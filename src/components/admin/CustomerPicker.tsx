"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, UserPlus, Loader2, X } from "lucide-react";

export interface ResolvedCustomer {
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface AddressPrefill {
  name: string;
  phone: string;
  district: string;
  area: string;
  street: string;
  insideDhaka: boolean;
  label: string;
}

interface CustomerResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  addresses: { fullName: string; phone: string; district: string; area: string; street: string; isInsideDhaka: boolean; label: string }[];
}

type Mode = "existing" | "guest" | "new";

/** "Who is this order for" — an existing account (search by name/email/phone),
 * a one-off guest (no account), or a brand new account created on the spot.
 * Reports the resolved customer AND (when picking an existing customer with a
 * saved default address) a shipping prefill up to the parent form, which still
 * owns and can further edit those fields itself. */
export default function CustomerPicker({
  onResolved,
  onPrefill,
}: {
  onResolved: (customer: ResolvedCustomer | null) => void;
  onPrefill: (prefill: AddressPrefill) => void;
}) {
  const [mode, setMode] = useState<Mode>("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CustomerResult | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mode !== "existing" || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/customers?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults(d.customers || []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, mode]);

  function selectCustomer(c: CustomerResult) {
    setSelected(c);
    setResults([]);
    setQuery("");
    onResolved({ userId: c.id, name: c.name, email: c.email, phone: c.phone || undefined });
    const addr = c.addresses[0];
    if (addr) {
      onPrefill({
        name: addr.fullName,
        phone: addr.phone,
        district: addr.district,
        area: addr.area,
        street: addr.street,
        insideDhaka: addr.isInsideDhaka,
        label: addr.label,
      });
    }
  }

  function clearSelection() {
    setSelected(null);
    onResolved(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearSelection();
  }

  async function handleCreateCustomer() {
    if (newName.trim().length < 2 || !newEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Customer account created");
      onResolved({ userId: data.customer.id, name: data.customer.name, email: data.customer.email, phone: data.customer.phone || undefined });
      onPrefill({ name: data.customer.name, phone: data.customer.phone || "", district: "", area: "", street: "", insideDhaka: true, label: "Home" });
      setSelected({ ...data.customer, addresses: [] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["existing", "guest", "new"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              mode === m ? "border-rose-gold bg-rose-gold/10 text-rose-gold" : "border-ink/10 text-ink/70"
            }`}
          >
            {m === "existing" ? "Existing Customer" : m === "guest" ? "Guest" : "Create New Customer"}
          </button>
        ))}
      </div>

      {mode === "existing" && (
        <div>
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-ink/70">{selected.email} · {selected.phone}</p>
              </div>
              <button type="button" onClick={clearSelection} aria-label="Clear selected customer" className="text-ink/70 hover:text-ink">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone…"
                className="w-full rounded-lg border border-ink/10 pl-9 pr-4 py-2.5 text-sm"
              />
              {(searching || results.length > 0) && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-ink/5 max-h-60 overflow-y-auto">
                  {searching && <p className="text-xs text-ink/70 p-3">Searching…</p>}
                  {!searching && results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="flex w-full flex-col items-start px-3 py-2 hover:bg-beige/60 text-left"
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-[11px] text-ink/70">{c.email} · {c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-ink/35 mt-1.5">Type at least 2 characters to search real customer accounts.</p>
        </div>
      )}

      {mode === "guest" && (
        <p className="text-xs text-ink/70 bg-beige/60 rounded-lg p-3">
          No account will be linked — fill in the shipping details below to record this order for a one-off guest.
        </p>
      )}

      {mode === "new" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" />
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" />
          </div>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={handleCreateCustomer}
            disabled={creating}
            className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-ink text-white px-3.5 py-2 disabled:opacity-50"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            Create Customer
          </button>
          {selected && <p className="text-xs text-success">✓ {selected.name} created and linked to this order.</p>}
        </div>
      )}
    </div>
  );
}
