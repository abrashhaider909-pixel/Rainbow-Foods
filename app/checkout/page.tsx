"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Store,
  Truck,
  ShoppingBag,
} from "lucide-react";
import type {
  FulfillmentMethod,
  PaymentMethod,
  Product,
  SavedAddress,
  SessionUser,
  StoreSettings,
} from "@/lib/types";
import { validatePhoneNumber } from "@/lib/validation";

type CartItem = Product & { quantity: number };
const CART_STORAGE_KEY = "rainbow-rewri-cart";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Form states
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [altPhone, setAltPhone] = useState("");

  // Delivery states
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Lahore");
  const [instructions, setInstructions] = useState("");
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Pickup states
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [pickupSlot, setPickupSlot] = useState("11:00 AM - 01:00 PM");

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [transactionId, setTransactionId] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiptNote, setReceiptNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          window.setTimeout(() => setCart(parsed), 0);
        }
      }
    } catch {
      // ignore
    }
    window.setTimeout(() => setCartLoaded(true), 0);
  }, []);

  // Load user session & store settings
  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, settingsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/settings"),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setUser(userData.user);
            setName(userData.user.name || "");
            setEmail(userData.user.email || "");
            setPhone(userData.user.phone || "");
            if (Array.isArray(userData.user.savedAddresses) && userData.user.savedAddresses.length > 0) {
              setSavedAddresses(userData.user.savedAddresses);
              const defaultAddr = userData.user.savedAddresses.find((a: SavedAddress) => a.isDefault) || userData.user.savedAddresses[0];
              if (defaultAddr) {
                setStreet(defaultAddr.street || "");
                setArea(defaultAddr.area || "");
                setCity(defaultAddr.city || "Lahore");
              }
            }
          }
        }

        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setSettings(s);
          if (s.pickupTimeSlots && s.pickupTimeSlots.length > 0) {
            setPickupSlot(s.pickupTimeSlots[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load checkout settings:", e);
      }
    }
    loadData();
  }, []);

  // Price calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const unit = item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
      return sum + unit * item.quantity;
    }, 0);
  }, [cart]);

  const savings = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.salePrice && item.salePrice < item.price) {
        return sum + (item.price - item.salePrice) * item.quantity;
      }
      return sum;
    }, 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (fulfillmentMethod === "pickup") return 0;
    if (!settings) return 150;
    if (settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold) {
      return 0;
    }
    return settings.deliveryFee ?? 150;
  }, [fulfillmentMethod, subtotal, settings]);

  const finalTotal = subtotal + deliveryFee;

  function selectSavedAddress(addr: SavedAddress) {
    setStreet(addr.street);
    setArea(addr.area);
    setCity(addr.city);
    if (addr.notes) setInstructions(addr.notes);
  }

  function handleChooseDelivery() {
    setFulfillmentMethod("delivery");
    if (paymentMethod === "cop") {
      setPaymentMethod("cod");
    }
  }

  function handleChoosePickup() {
    setFulfillmentMethod("pickup");
    if (paymentMethod === "cod") {
      setPaymentMethod("cop");
    }
  }

  async function handlePlaceOrder(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (cart.length === 0) {
      setErrorMessage("Your basket is empty.");
      return;
    }

    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.valid) {
      setErrorMessage(phoneVal.error || "Please enter a valid phone number.");
      return;
    }

    if (fulfillmentMethod === "delivery" && (!street.trim() || !city.trim())) {
      setErrorMessage("Please provide your delivery street address and city.");
      return;
    }

    if (paymentMethod === "transfer" && !transactionId.trim()) {
      setErrorMessage("Please enter your Transaction Reference ID (TID) for Online Cash Transfer.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        customer: {
          name: name.trim(),
          phone: phoneVal.normalized,
          email: email.trim() || undefined,
          altPhone: altPhone.trim() || undefined,
        },
        fulfillmentMethod,
        paymentMethod,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      };

      if (fulfillmentMethod === "delivery") {
        payload.deliveryAddress = {
          street: street.trim(),
          area: area.trim(),
          city: city.trim(),
          instructions: instructions.trim(),
        };
      } else {
        payload.pickupDetails = {
          pickupDate,
          pickupSlot,
        };
      }

      if (paymentMethod === "transfer") {
        payload.paymentDetails = {
          transactionId: transactionId.trim(),
          senderAccount: senderAccount.trim(),
          senderName: senderName.trim(),
          receiptNote: receiptNote.trim(),
        };
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order.");
      }

      if (user && saveToProfile && fulfillmentMethod === "delivery") {
        fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: area || "Home",
            street,
            area,
            city,
            notes: instructions,
          }),
        }).catch(() => {});
      }

      localStorage.removeItem(CART_STORAGE_KEY);
      router.push(`/orders/${data.orderNumber}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cartLoaded) {
    return (
      <main className="min-h-screen bg-[#faf8f1] px-5 py-24 text-center text-[#244c37]">
        <h1 className="font-serif text-2xl">Loading basket…</h1>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#faf8f1] px-5 py-24 text-center text-[#244c37]">
        <div className="mx-auto max-w-md rounded-3xl border border-[#244c37]/10 bg-white p-8 sm:p-12">
          <ShoppingBag size={48} className="mx-auto text-[#bd7d28]" />
          <h1 className="mt-5 font-serif text-3xl font-bold">Your basket is empty</h1>
          <p className="mt-2 text-sm text-[#657264]">
            Add some delightful sweets, snacks, or comforting meals before heading to checkout.
          </p>
          <Link
            href="/#products"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#244c37] px-8 py-3.5 font-semibold text-white transition hover:bg-[#183724]"
          >
            Explore Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f1] text-[#244c37] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#244c37]/10 bg-[#faf8f1]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#244c37] text-xl font-bold text-[#e8b75b]">
              R
            </span>
            <span>
              <span className="block font-serif text-xl font-bold tracking-wide">Rainbow Rewri</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-[#8b7857]">
                Secure Checkout
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8b7857] hover:text-[#244c37]"
          >
            <ArrowLeft size={16} /> Back to menu
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <h1 className="font-serif text-4xl font-medium sm:text-5xl">Checkout</h1>
        <p className="mt-2 text-base text-[#657264]">
          Complete your contact, fulfillment, and payment details below.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="mt-8 grid gap-10 lg:grid-cols-12">
          {/* Form left columns */}
          <div className="space-y-8 lg:col-span-7">
            {/* 1. Fulfillment Method */}
            <div className="rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#244c37] text-sm text-[#e8b75b]">
                  1
                </span>
                Fulfillment Method
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleChooseDelivery}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition ${
                    fulfillmentMethod === "delivery"
                      ? "border-[#244c37] bg-[#244c37]/5 font-semibold text-[#244c37]"
                      : "border-[#244c37]/15 hover:bg-[#faf8f1]"
                  }`}
                >
                  <Truck size={28} className="text-[#bd7d28]" />
                  <span className="mt-2 text-base">Home Delivery</span>
                  <span className="mt-1 text-xs text-[#657264]">
                    {deliveryFee === 0 ? "Free delivery eligible" : "Flat delivery charge"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleChoosePickup}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition ${
                    fulfillmentMethod === "pickup"
                      ? "border-[#244c37] bg-[#244c37]/5 font-semibold text-[#244c37]"
                      : "border-[#244c37]/15 hover:bg-[#faf8f1]"
                  }`}
                >
                  <Store size={28} className="text-[#bd7d28]" />
                  <span className="mt-2 text-base">Store Pickup</span>
                  <span className="mt-1 text-xs text-[#657264]">Pick up fresh at our store (Free)</span>
                </button>
              </div>

              {/* Pickup details preview if pickup selected */}
              {fulfillmentMethod === "pickup" && settings && (
                <div className="mt-6 rounded-2xl bg-[#f0e8d6]/60 p-5 border border-[#d9c79f]">
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="mt-0.5 text-[#c98a35] shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Pickup Location</p>
                      <p className="mt-1 text-sm text-[#657264]">{settings.pickupAddress}</p>
                      <p className="mt-2 text-xs text-[#8b7857]">{settings.pickupInstructions}</p>
                      <p className="mt-1 text-xs text-[#8b7857]">Store Contact: {settings.storePhone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Customer Contact */}
            <div className="rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#244c37] text-sm text-[#e8b75b]">
                  2
                </span>
                Customer Details
              </h2>

              {!user && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#faf8f1] p-3 text-xs text-[#657264]">
                  <span>Already have an account with saved addresses?</span>
                  <Link href="/login" className="font-bold text-[#bd7d28] hover:underline">
                    Log in here
                  </Link>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                  />
                  <p className="mt-1 text-[11px] text-[#8b7857]">Pakistani mobile or international</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Alternative Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="Secondary contact"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com (for receipts)"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. Address or Pickup Slot */}
            <div className="rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#244c37] text-sm text-[#e8b75b]">
                  3
                </span>
                {fulfillmentMethod === "delivery" ? "Delivery Address" : "Pickup Schedule"}
              </h2>

              {fulfillmentMethod === "delivery" ? (
                <div className="mt-5 space-y-4">
                  {savedAddresses.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#657264] mb-2">
                        Use a saved address:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((addr) => (
                          <button
                            type="button"
                            key={addr.id}
                            onClick={() => selectSavedAddress(addr)}
                            className="rounded-full border border-[#244c37]/20 bg-[#faf8f1] px-4 py-1.5 text-xs font-semibold hover:border-[#244c37] hover:bg-white transition"
                          >
                            {addr.title}: {addr.street}, {addr.city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                        Street Address / House / Building *
                      </label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="House / Apartment #, Street #, Road"
                        className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                        Area / Sector
                      </label>
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. Gulberg III, DHA Phase 5"
                        className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                      />
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
                        placeholder="e.g. Lahore, Karachi, Islamabad"
                        className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                        Special Delivery Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Landmark, gate code, ring bell twice, etc."
                        className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                      />
                    </div>

                    {user && (
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="saveToProfile"
                          checked={saveToProfile}
                          onChange={(e) => setSaveToProfile(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#244c37]"
                        />
                        <label htmlFor="saveToProfile" className="text-sm text-[#657264]">
                          Save this address to my profile for future orders
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                      Choose Pickup Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                      Choose Pickup Time Slot
                    </label>
                    <select
                      value={pickupSlot}
                      onChange={(e) => setPickupSlot(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                    >
                      {(settings?.pickupTimeSlots || ["11:00 AM - 01:00 PM", "02:00 PM - 05:00 PM", "06:00 PM - 09:00 PM"]).map(
                        (slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Payment Method */}
            <div className="rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#244c37] text-sm text-[#e8b75b]">
                  4
                </span>
                Payment Method
              </h2>

              <div className="mt-5 space-y-3">
                {fulfillmentMethod === "delivery" ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-[#244c37]/20 p-4 transition hover:bg-[#faf8f1] cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 accent-[#244c37]"
                    />
                    <div>
                      <span className="font-semibold text-base">Cash on Delivery (COD)</span>
                      <p className="text-xs text-[#657264] mt-0.5">
                        Pay cash to our delivery courier upon receiving your order.
                      </p>
                    </div>
                  </label>
                ) : (
                  <label className="flex items-start gap-3 rounded-2xl border border-[#244c37]/20 p-4 transition hover:bg-[#faf8f1] cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cop"
                      checked={paymentMethod === "cop"}
                      onChange={() => setPaymentMethod("cop")}
                      className="mt-1 accent-[#244c37]"
                    />
                    <div>
                      <span className="font-semibold text-base">Cash on Pickup (COP)</span>
                      <p className="text-xs text-[#657264] mt-0.5">
                        Pay cash at the pickup counter when collecting your items.
                      </p>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 rounded-2xl border border-[#244c37]/20 p-4 transition hover:bg-[#faf8f1] cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={() => setPaymentMethod("transfer")}
                    className="mt-1 accent-[#244c37]"
                  />
                  <div>
                    <span className="font-semibold text-base">Online Cash Transfer</span>
                    <p className="text-xs text-[#657264] mt-0.5">
                      Bank Transfer / JazzCash / EasyPaisa with manual verification.
                    </p>
                  </div>
                </label>
              </div>

              {/* Online Transfer Information Box */}
              {paymentMethod === "transfer" && settings && (
                <div className="mt-5 rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/15">
                  <h4 className="font-serif text-lg font-bold text-[#244c37]">
                    Store Account Transfer Details
                  </h4>
                  <p className="mt-1 text-xs text-[#657264] leading-relaxed">
                    {settings.bankDetails?.instructions}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs bg-white p-4 rounded-xl border border-[#244c37]/10">
                    <div>
                      <span className="text-[#8b7857] block">Bank Name:</span>
                      <span className="font-semibold">{settings.bankDetails?.bankName}</span>
                    </div>
                    <div>
                      <span className="text-[#8b7857] block">Account Title:</span>
                      <span className="font-semibold">{settings.bankDetails?.accountTitle}</span>
                    </div>
                    <div>
                      <span className="text-[#8b7857] block">Account Number:</span>
                      <span className="font-mono font-semibold">{settings.bankDetails?.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#8b7857] block">IBAN:</span>
                      <span className="font-mono font-semibold">{settings.bankDetails?.iban}</span>
                    </div>
                    {settings.bankDetails?.jazzCashNumber && (
                      <div className="sm:col-span-2 border-t pt-2 border-[#244c37]/10">
                        <span className="text-[#8b7857] block">JazzCash / EasyPaisa:</span>
                        <span className="font-mono font-semibold">{settings.bankDetails.jazzCashNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                        Transaction Reference ID (TID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 1928472910"
                        className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-3 text-sm text-[#244c37] outline-none"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                          Sender Name
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Name on bank/wallet account"
                          className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-3 text-sm text-[#244c37] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                          Sender Account / Phone
                        </label>
                        <input
                          type="text"
                          value={senderAccount}
                          onChange={(e) => setSenderAccount(e.target.value)}
                          placeholder="0300... or account number"
                          className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-3 text-sm text-[#244c37] outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                          Payment Notes / Receipt Details (Optional)
                        </label>
                        <input
                          type="text"
                          value={receiptNote}
                          onChange={(e) => setReceiptNote(e.target.value)}
                          placeholder="Any extra reference details for verification"
                          className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-white px-4 py-3 text-sm text-[#244c37] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Confirmation Button */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-8 shadow-xl shadow-[#244c37]/5">
              <h3 className="font-serif text-2xl font-bold">Order Summary</h3>

              <div className="mt-6 max-h-80 overflow-y-auto space-y-4 divide-y divide-[#244c37]/10 pr-1">
                {cart.map((item) => {
                  const unitPrice =
                    item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
                  return (
                    <div key={item.id} className="flex items-center gap-3 pt-3 first:pt-0">
                      <Image
                        unoptimized
                        width={60}
                        height={60}
                        src={item.image}
                        alt={item.name}
                        className="h-14 w-14 rounded-xl object-cover bg-[#f0e8d6] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-sm font-bold truncate">{item.name}</p>
                        <p className="text-xs text-[#657264]">
                          Qty: {item.quantity} × {formatPrice(unitPrice)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {formatPrice(unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[#244c37]/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#657264]">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount Savings</span>
                    <span>- {formatPrice(savings)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#657264]">
                  <span>Fulfillment</span>
                  <span>
                    {fulfillmentMethod === "pickup"
                      ? "Store Pickup (Free)"
                      : deliveryFee === 0
                      ? "Free Delivery"
                      : formatPrice(deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#244c37]/10 pt-3 text-lg font-bold">
                  <span className="font-serif">Total</span>
                  <span className="font-serif text-2xl text-[#244c37]">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-full bg-[#244c37] py-4 text-center font-semibold text-white shadow-lg transition hover:bg-[#183724] disabled:opacity-50"
              >
                {submitting ? "Placing Order…" : `Place Order • ${formatPrice(finalTotal)}`}
              </button>

              <p className="mt-3 text-center text-xs text-[#8b7857]">
                By clicking Place Order, your order will be reserved and confirmed with our kitchen.
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
