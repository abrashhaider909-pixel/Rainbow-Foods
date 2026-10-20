"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, MapPin, CheckCircle2 } from "lucide-react";
import type { SavedAddress } from "@/lib/types";

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [title, setTitle] = useState("Home");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Lahore");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/account/addresses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.addresses) {
          setAddresses(data.addresses);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAddAddress(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          street,
          area,
          city,
          notes,
          isDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save address.");

      setAddresses(data.addresses || []);
      setIsAdding(false);
      setStreet("");
      setArea("");
      setNotes("");
      setIsDefault(false);
      setMessage("Address saved successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
        setMessage("Address removed.");
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-5">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">Saved Addresses</h1>
          <p className="mt-1 text-sm text-[#657264]">
            Manage your delivery locations for faster checkout on future orders.
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#244c37] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#183724]"
          >
            <Plus size={16} /> Add New Address
          </button>
        )}
      </div>

      {message && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Add Address Form */}
      {isAdding && (
        <form onSubmit={handleAddAddress} className="mt-6 rounded-2xl bg-[#faf8f1] p-6 border border-[#244c37]/15">
          <h3 className="font-serif text-xl font-bold">Add Delivery Address</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Address Label
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-sm outline-none"
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Street Address / Building *
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="House #, Street #, Sector"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Area / Sector / Landmark
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Gulberg III, DHA Phase 5"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Special Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ring bell, near market gate"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="defaultCheck"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded accent-[#244c37]"
              />
              <label htmlFor="defaultCheck" className="text-xs text-[#657264]">
                Set as default address for future orders
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#244c37] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#183724]"
            >
              {saving ? "Saving…" : "Save Address"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-full border border-[#244c37]/20 px-6 py-2.5 text-xs font-semibold hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      <div className="mt-8">
        {loading ? (
          <p className="py-8 text-center text-xs text-[#657264]">Loading addresses…</p>
        ) : addresses.length === 0 && !isAdding ? (
          <div className="py-12 text-center text-[#657264]">
            <MapPin size={40} className="mx-auto text-[#bd7d28]" />
            <h3 className="mt-3 font-serif text-xl font-bold">No saved addresses</h3>
            <p className="mt-1 text-xs">Save home and work addresses to speed up checkout.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="relative rounded-2xl border border-[#244c37]/10 bg-[#faf8f1] p-5 transition hover:border-[#244c37]/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold">{addr.title}</span>
                    {addr.isDefault && (
                      <span className="rounded-full bg-[#e8b75b] px-2 py-0.5 text-[10px] font-bold text-[#244c37]">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Remove address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#657264]">{addr.street}</p>
                {addr.area && <p className="text-xs text-[#657264]">{addr.area}</p>}
                <p className="text-xs font-semibold text-[#244c37] mt-1">{addr.city}</p>
                {addr.notes && (
                  <p className="mt-2 text-[11px] italic text-[#8b7857]">Note: &quot;{addr.notes}&quot;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
