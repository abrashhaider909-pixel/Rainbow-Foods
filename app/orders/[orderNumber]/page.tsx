"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
  Store,
  Truck,
  AlertCircle,
} from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderNumber}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Order not found.");
        }
        setOrder(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load order.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf8f1] px-5 py-24 text-center text-[#244c37]">
        <h1 className="font-serif text-3xl">Loading order details…</h1>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#faf8f1] px-5 py-24 text-center text-[#244c37]">
        <div className="mx-auto max-w-md rounded-3xl border border-[#244c37]/10 bg-white p-8 sm:p-12">
          <AlertCircle size={48} className="mx-auto text-red-600" />
          <h1 className="mt-5 font-serif text-2xl font-bold">Could not locate order</h1>
          <p className="mt-2 text-sm text-[#657264]">{error || "Please verify the order number."}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#244c37] px-6 py-3 font-semibold text-white transition hover:bg-[#183724]"
          >
            <ArrowLeft size={16} /> Return to Home
          </Link>
        </div>
      </main>
    );
  }

  // Determine active step index in progress bar
  const isPickup = order.fulfillmentMethod === "pickup";
  const step4Label = isPickup ? "Ready for Pickup" : "Out for Delivery";

  const getStepIndex = (status: OrderStatus) => {
    if (status === "Pending" || status === "Payment Verification Pending") return 0;
    if (status === "Confirmed") return 1;
    if (status === "Preparing") return 2;
    if (status === "Ready for Pickup" || status === "Out for Delivery") return 3;
    if (status === "Completed") return 4;
    return -1; // e.g. Cancelled
  };

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === "Cancelled";

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
                Order Tracking
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#244c37]/20 px-4 py-2 text-xs font-semibold hover:bg-white"
            >
              <Printer size={15} /> Print Receipt
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#244c37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#183724]"
            >
              <ShoppingBag size={15} /> Menu
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 pt-10 sm:px-8">
        {/* Order Success Banner */}
        <div className="rounded-3xl border border-[#244c37]/10 bg-white p-6 sm:p-10 shadow-xl shadow-[#244c37]/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e8b75b]/30 px-3 py-1 text-xs font-bold text-[#8c6a32] uppercase tracking-wider">
                Order Confirmed
              </span>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-medium">
                #{order.orderNumber}
              </h1>
              <p className="mt-1 text-xs text-[#657264]">
                Placed on {new Date(order.createdAt).toLocaleDateString("en-PK", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-xs uppercase tracking-wider text-[#8b7857]">Status</span>
              <span
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  order.status === "Completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : order.status === "Cancelled"
                    ? "bg-red-100 text-red-800"
                    : order.status === "Payment Verification Pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-[#244c37] text-[#e8b75b]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {order.status}
              </span>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="py-8">
            <h2 className="font-serif text-xl font-bold">Fulfillment Progress</h2>

            {isCancelled ? (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                This order has been cancelled. If you have questions, please contact the store.
              </div>
            ) : (
              <div className="mt-6">
                {/* Step bars */}
                <div className="relative flex justify-between">
                  <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-[#244c37]/10 z-0" />
                  <div
                    className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#244c37] z-0 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (currentStepIdx / 4) * 100))}%`,
                    }}
                  />

                  {[
                    "Placed",
                    "Confirmed",
                    "Preparing",
                    step4Label,
                    "Completed",
                  ].map((label, idx) => {
                    const isPassed = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={label} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isPassed
                              ? "bg-[#244c37] text-[#e8b75b] ring-4 ring-[#faf8f1]"
                              : "bg-[#e2dac9] text-[#786b55]"
                          }`}
                        >
                          {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <span
                          className={`mt-2 text-[11px] font-semibold text-center hidden sm:block ${
                            isCurrent ? "text-[#244c37]" : "text-[#8b7857]"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expected fulfillment date notice if configured */}
            {order.expectedDate && (
              <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[#f0e8d6]/50 p-4 text-xs font-medium text-[#8c6a32] border border-[#d9c79f]">
                <Calendar size={18} />
                <span>
                  Estimated {isPickup ? "pickup" : "delivery"} date: <strong>{order.expectedDate}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Fulfillment & Payment Details Cards */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 border-t border-[#244c37]/10 pt-6">
            <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
              <h3 className="flex items-center gap-2 font-serif text-base font-bold">
                {isPickup ? <Store size={18} className="text-[#bd7d28]" /> : <Truck size={18} className="text-[#bd7d28]" />}
                {isPickup ? "Store Pickup Details" : "Delivery Address"}
              </h3>

              {isPickup ? (
                <div className="mt-3 space-y-1 text-xs text-[#657264]">
                  <p>
                    <strong>Location:</strong> {order.pickupDetails?.storeAddress}
                  </p>
                  <p>
                    <strong>Scheduled Date:</strong> {order.pickupDetails?.pickupDate}
                  </p>
                  <p>
                    <strong>Time Slot:</strong> {order.pickupDetails?.pickupSlot}
                  </p>
                  <p>
                    <strong>Contact:</strong> {order.pickupDetails?.contactPhone}
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-1 text-xs text-[#657264]">
                  <p>
                    <strong>Recipient:</strong> {order.customer.name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {order.customer.phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {order.deliveryAddress?.street}
                    {order.deliveryAddress?.area ? `, ${order.deliveryAddress.area}` : ""}
                    {order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""}
                  </p>
                  {order.deliveryAddress?.instructions && (
                    <p className="italic text-[#8b7857]">
                      Note: &quot;{order.deliveryAddress.instructions}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
              <h3 className="flex items-center gap-2 font-serif text-base font-bold">
                <Clock size={18} className="text-[#bd7d28]" /> Payment Details
              </h3>
              <div className="mt-3 space-y-1 text-xs text-[#657264]">
                <p>
                  <strong>Method:</strong>{" "}
                  {order.paymentMethod === "cod"
                    ? "Cash on Delivery"
                    : order.paymentMethod === "cop"
                    ? "Cash on Pickup"
                    : "Online Cash Transfer"}
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  <span
                    className={`font-semibold ${
                      order.paymentStatus === "paid" || order.paymentStatus === "verified"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {order.paymentStatus === "verified" || order.paymentStatus === "paid"
                      ? "Verified & Paid"
                      : "Pending Collection/Verification"}
                  </span>
                </p>
                {order.paymentDetails?.transactionId && (
                  <p>
                    <strong>TID:</strong> <span className="font-mono">{order.paymentDetails.transactionId}</span>
                  </p>
                )}
                {order.customerNote && (
                  <div className="mt-2 rounded-xl bg-white p-2.5 border border-[#244c37]/10">
                    <span className="font-bold text-[#244c37] block">Store Update:</span>
                    <span>{order.customerNote}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div className="mt-8 border-t border-[#244c37]/10 pt-6">
            <h3 className="font-serif text-xl font-bold">Order Items</h3>
            <div className="mt-4 divide-y divide-[#244c37]/10">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <Image
                        unoptimized
                        width={50}
                        height={50}
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover bg-[#f0e8d6]"
                      />
                    )}
                    <div>
                      <p className="font-serif text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-[#657264]">
                        {item.quantity} × {formatPrice(item.salePrice || item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-6 rounded-2xl bg-[#faf8f1] p-5 space-y-2 text-sm border border-[#244c37]/10">
              <div className="flex justify-between text-[#657264]">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Applied</span>
                  <span>- {formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#657264]">
                <span>Fulfillment Fee</span>
                <span>{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-[#244c37]/10 pt-2 text-base font-bold">
                <span className="font-serif">Grand Total</span>
                <span className="font-serif text-xl text-[#244c37]">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="mt-8 border-t border-[#244c37]/10 pt-6">
              <h3 className="font-serif text-lg font-bold">Status History</h3>
              <div className="mt-3 space-y-3">
                {order.statusHistory.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#bd7d28] shrink-0" />
                    <div>
                      <span className="font-semibold">{entry.status}</span>
                      <span className="text-[#8b7857] ml-2">
                        {new Date(entry.timestamp).toLocaleString("en-PK", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {entry.note && <p className="text-[#657264] mt-0.5">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-4 border-t border-[#244c37]/10 pt-6">
            <Link
              href="/"
              className="rounded-full bg-[#244c37] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#183724]"
            >
              Order More Treats
            </Link>
            <Link
              href="/account/orders"
              className="rounded-full border border-[#244c37]/20 px-7 py-3 text-sm font-semibold hover:bg-white"
            >
              View All My Orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
