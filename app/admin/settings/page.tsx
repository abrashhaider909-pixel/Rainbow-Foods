"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Save, Store, Truck, CreditCard } from "lucide-react";
import type { StoreSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Store information
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [pickupTimeSlots, setPickupTimeSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");

  // Delivery rules
  const [deliveryFee, setDeliveryFee] = useState<number>(150);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(2000);

  // Bank & wallet transfer instructions
  const [bankName, setBankName] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [jazzCashNumber, setJazzCashNumber] = useState("");
  const [easyPaisaNumber, setEasyPaisaNumber] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  // Inventory
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((s: StoreSettings | null) => {
        if (isMounted && s) {
          setStoreName(s.storeName || "Rainbow Rewri & Foods");
          setStorePhone(s.storePhone || "+92 300 8484910");
          setPickupAddress(s.pickupAddress || "");
          setPickupInstructions(s.pickupInstructions || "");
          setPickupTimeSlots(s.pickupTimeSlots || []);
          setDeliveryFee(s.deliveryFee ?? 150);
          setFreeDeliveryThreshold(s.freeDeliveryThreshold ?? 2000);
          setBankName(s.bankDetails?.bankName || "");
          setAccountTitle(s.bankDetails?.accountTitle || "");
          setAccountNumber(s.bankDetails?.accountNumber || "");
          setIban(s.bankDetails?.iban || "");
          setJazzCashNumber(s.bankDetails?.jazzCashNumber || "");
          setEasyPaisaNumber(s.bankDetails?.easyPaisaNumber || "");
          setPaymentInstructions(s.bankDetails?.instructions || "");
          setLowStockThreshold(s.lowStockThreshold ?? 5);
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

  function handleAddSlot() {
    if (!newSlot.trim()) return;
    setPickupTimeSlots([...pickupTimeSlots, newSlot.trim()]);
    setNewSlot("");
  }

  function handleRemoveSlot(index: number) {
    setPickupTimeSlots(pickupTimeSlots.filter((_, i) => i !== index));
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const payload: Partial<StoreSettings> = {
        storeName,
        storePhone,
        pickupAddress,
        pickupInstructions,
        pickupTimeSlots,
        deliveryFee,
        freeDeliveryThreshold,
        bankDetails: {
          bankName,
          accountTitle,
          accountNumber,
          iban,
          jazzCashNumber,
          easyPaisaNumber,
          instructions: paymentInstructions,
        },
        lowStockThreshold,
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings.");

      setSuccess("Store settings saved and updated live across the website!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-12 text-center text-[#657264]">
        <h2 className="font-serif text-2xl font-bold">Loading store configurations…</h2>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="border-b border-[#244c37]/10 pb-5">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Pickup & Delivery Settings</h1>
        <p className="mt-1 text-sm text-[#657264]">
          Configure physical pickup location, delivery charges, bank payment accounts, and inventory alerts.
        </p>
      </div>

      {success && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="mt-8 space-y-8">
        {/* 1. Store Pickup Configuration */}
        <div className="rounded-2xl border border-[#244c37]/15 bg-[#faf8f1] p-6 space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <Store size={20} className="text-[#bd7d28]" /> Store Pickup Configuration
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Store Brand Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Store Contact Phone
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Physical Pickup Address
              </label>
              <textarea
                rows={2}
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Full address where customers can collect their orders…"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Pickup Instructions
              </label>
              <input
                type="text"
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                placeholder="Instructions shown to customers choosing store pickup…"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Available Pickup Time Slots
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {pickupTimeSlots.map((slot, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#244c37] border border-[#244c37]/20"
                  >
                    {slot}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(i)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="e.g. 07:00 PM - 09:00 PM"
                  className="w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="rounded-xl bg-[#244c37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#183724]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Delivery Charges & Rules */}
        <div className="rounded-2xl border border-[#244c37]/15 bg-[#faf8f1] p-6 space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <Truck size={20} className="text-[#bd7d28]" /> Delivery Rules & Pricing
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Standard Home Delivery Fee (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
              <p className="mt-1 text-[11px] text-[#8b7857]">Charged on eligible delivery orders</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Free Delivery Order Threshold (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
              <p className="mt-1 text-[11px] text-[#8b7857]">
                Orders at or above this amount automatically receive Free Delivery
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
              <p className="mt-1 text-[11px] text-[#8b7857]">
                Trigger alerts when product inventory drops to or below this count
              </p>
            </div>
          </div>
        </div>

        {/* 3. Online Cash Transfer Accounts */}
        <div className="rounded-2xl border border-[#244c37]/15 bg-[#faf8f1] p-6 space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <CreditCard size={20} className="text-[#bd7d28]" /> Online Cash Transfer Accounts
          </h2>
          <p className="text-xs text-[#657264]">
            Shown to customers who choose Online Cash Transfer at checkout.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Account Title
              </label>
              <input
                type="text"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                IBAN
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                JazzCash Account
              </label>
              <input
                type="text"
                value={jazzCashNumber}
                onChange={(e) => setJazzCashNumber(e.target.value)}
                placeholder="0300 1234567"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                EasyPaisa Account
              </label>
              <input
                type="text"
                value={easyPaisaNumber}
                onChange={(e) => setEasyPaisaNumber(e.target.value)}
                placeholder="0300 1234567"
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Transfer Instructions for Customers
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-2.5 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[#244c37] px-8 py-3.5 text-xs font-semibold text-white hover:bg-[#183724] disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving Changes…" : "Save Store Settings"}
        </button>
      </form>
    </div>
  );
}
