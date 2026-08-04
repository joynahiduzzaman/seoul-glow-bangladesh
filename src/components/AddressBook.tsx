"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  area: string;
  street: string;
  isInsideDhaka: boolean;
  isDefault: boolean;
}

const EMPTY_FORM = {
  label: "Home",
  fullName: "",
  phone: "",
  district: "",
  area: "",
  street: "",
  isInsideDhaka: true,
  isDefault: false,
};

export default function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function openNewForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(address: Address) {
    setForm({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      district: address.district,
      area: address.area,
      street: address.street,
      isInsideDhaka: address.isInsideDhaka,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingId) {
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === editingId) return data.address;
            return form.isDefault ? { ...a, isDefault: false } : a;
          })
        );
      } else {
        setAddresses((prev) => [data.address, ...(form.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev)]);
      }
      toast.success(editingId ? "Address updated" : "Address added");
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address deleted");
    } else {
      toast.error("Failed to delete address");
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      toast.success("Default address updated");
    } else {
      toast.error("Failed to update default address");
    }
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !formOpen && (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-ink/70 mb-4">You haven't saved any addresses yet.</p>
        </div>
      )}

      {addresses.map((address) => (
        <div key={address.id} className="card-surface p-5 flex items-start justify-between gap-4">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-semibold">{address.label}</span>
              {address.isDefault && <span className="text-[10px] bg-pastel-green/50 rounded-full px-2 py-0.5">Default</span>}
            </div>
            <p className="text-ink/70">{address.fullName} · {address.phone}</p>
            <p className="text-ink/70">{address.street}, {address.area}, {address.district}</p>
            <p className="text-ink/70 text-xs mt-0.5">{address.isInsideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!address.isDefault && (
              <button onClick={() => handleSetDefault(address.id)} aria-label="Set as default" className="touch-target !min-h-[36px] !min-w-[36px] text-ink/70 hover:text-rose-gold" title="Set as default">
                <Star size={16} />
              </button>
            )}
            <button onClick={() => openEditForm(address)} aria-label="Edit address" className="touch-target !min-h-[36px] !min-w-[36px] text-ink/70 hover:text-rose-gold">
              <Pencil size={16} />
            </button>
            <button onClick={() => handleDelete(address.id)} aria-label="Delete address" className="touch-target !min-h-[36px] !min-w-[36px] text-ink/70 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="card-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{editingId ? "Edit Address" : "New Address"}</h3>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="text-ink/70 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Label (e.g. Home, Office)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="col-span-2 rounded-lg border border-ink/10 px-4 py-2.5 text-sm" required />
            <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="col-span-2 rounded-lg border border-ink/10 px-4 py-2.5 text-sm" required />
            <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" required />
            <input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="rounded-lg border border-ink/10 px-4 py-2.5 text-sm" required />
            <input placeholder="Area / Thana" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="col-span-2 rounded-lg border border-ink/10 px-4 py-2.5 text-sm" required />
            <textarea placeholder="Street address, house/road no." value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="col-span-2 rounded-lg border border-ink/10 px-4 py-2.5 text-sm" rows={2} required />
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isInsideDhaka} onChange={(e) => setForm({ ...form, isInsideDhaka: e.target.checked })} />
              Inside Dhaka
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Set as default address
            </label>
          </div>
          <button disabled={loading} className="btn-primary w-full">{loading ? "Saving…" : editingId ? "Save Changes" : "Add Address"}</button>
        </form>
      ) : (
        <button onClick={openNewForm} className="btn-outline w-full flex items-center justify-center gap-2">
          <Plus size={16} /> Add New Address
        </button>
      )}
    </div>
  );
}
