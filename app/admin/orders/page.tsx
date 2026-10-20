"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Package,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

const ALL_STATUSES: OrderStatus[] = [
  "Pending",
  "Payment Verification Pending",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("All");

  // Selected order for inspection modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modal editing states
  const [editStatus, setEditStatus] = useState<OrderStatus>("Pending");
  const [editStatusNote, setEditStatusNote] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>("pending");
  const [editExpectedDate, setEditExpectedDate] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editCustomerNote, setEditCustomerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.orders) {
          setOrders(data.orders);
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

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (fulfillmentFilter !== "All" && o.fulfillmentMethod !== fulfillmentFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.toLowerCase().includes(q) ||
          (o.customer.email && o.customer.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, statusFilter, fulfillmentFilter, search]);

  function openOrderModal(order: Order) {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditStatusNote("");
    setEditPaymentStatus(order.paymentStatus);
    setEditExpectedDate(order.expectedDate || "");
    setEditInternalNotes(order.internalNotes || "");
    setEditCustomerNote(order.customerNote || "");
    setSaveSuccess("");
  }

  async function handleSaveOrder() {
    if (!selectedOrder) return;
    setSaving(true);
    setSaveSuccess("");

    try {
      const res = await fetch(`/api/orders/${selectedOrder.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          statusNote: editStatusNote,
          paymentStatus: editPaymentStatus,
          expectedDate: editExpectedDate,
          internalNotes: editInternalNotes,
          customerNote: editCustomerNote,
        }),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Failed to update order.");

      setSelectedOrder(updated);
      setOrders((current) =>
        current.map((o) => (o.orderNumber === updated.orderNumber ? updated : o)),
      );
      setSaveSuccess("Order updated successfully!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-5">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">Order Management</h1>
          <p className="mt-1 text-sm text-[#657264]">
            Review incoming orders, verify cash payments, schedule deliveries, and update order statuses.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            loadOrders();
          }}
          className="rounded-full border border-[#244c37]/20 px-5 py-2 text-xs font-semibold hover:bg-[#faf8f1]"
        >
          Refresh Orders
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name, phone…"
            className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-xs text-[#244c37] outline-none"
          />
          <Search size={16} className="absolute left-4 top-3.5 text-[#8b7857]" />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-xs outline-none font-semibold text-[#244c37]"
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-xs outline-none font-semibold text-[#244c37]"
          >
            <option value="All">All Fulfillment</option>
            <option value="delivery">Home Delivery</option>
            <option value="pickup">Store Pickup</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="py-12 text-center text-xs text-[#657264]">Loading orders…</p>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-[#657264]">
            <Package size={40} className="mx-auto text-[#bd7d28]" />
            <p className="mt-3 font-serif text-lg font-bold">No orders found</p>
            <p className="mt-1 text-xs">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#244c37]/10 text-[#8b7857]">
                <th className="pb-3 font-bold uppercase tracking-wider">Order</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Customer</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Type</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Total</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Payment</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Status</th>
                <th className="pb-3 font-bold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#244c37]/10">
              {filteredOrders.map((o) => (
                <tr key={o.orderNumber} className="hover:bg-[#faf8f1] transition">
                  <td className="py-4 font-mono font-bold text-[#244c37]">
                    #{o.orderNumber}
                    <span className="block font-sans text-[10px] text-[#8b7857] font-normal">
                      {new Date(o.createdAt).toLocaleDateString("en-PK")}
                    </span>
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-sm">{o.customer.name}</p>
                    <p className="text-[#8b7857]">{o.customer.phone}</p>
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center gap-1 capitalize font-medium">
                      {o.fulfillmentMethod === "pickup" ? (
                        <Store size={14} className="text-[#bd7d28]" />
                      ) : (
                        <Truck size={14} className="text-[#bd7d28]" />
                      )}
                      {o.fulfillmentMethod}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-sm">{formatPrice(o.total)}</td>
                  <td className="py-4">
                    <span className="capitalize">{o.paymentMethod}</span>
                    <span
                      className={`ml-1.5 inline-block h-2 w-2 rounded-full ${
                        o.paymentStatus === "paid" || o.paymentStatus === "verified"
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                      }`}
                      title={o.paymentStatus}
                    />
                    {o.paymentMethod === "transfer" && (
                      <span className="block text-[10px] text-[#8b7857]">TID: {o.paymentDetails?.transactionId || "—"}</span>
                    )}
                  </td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        o.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : o.status === "Cancelled"
                          ? "bg-red-100 text-red-800"
                          : o.status === "Payment Verification Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[#244c37] text-[#e8b75b]"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => openOrderModal(o)}
                      className="rounded-full bg-[#244c37] px-4 py-1.5 font-semibold text-white hover:bg-[#183724]"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect & Manage Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#244c37]/10 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-[#8b7857]">Order Details</span>
                <h2 className="font-serif text-2xl font-bold">#{selectedOrder.orderNumber}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 hover:bg-[#faf8f1]"
              >
                <X size={20} />
              </button>
            </div>

            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={16} /> {saveSuccess}
              </div>
            )}

            {/* Customer & Fulfillment Info */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 rounded-2xl bg-[#faf8f1] p-4 text-xs border border-[#244c37]/10">
              <div>
                <span className="font-bold text-[#244c37] block">Customer</span>
                <p className="font-medium text-sm mt-0.5">{selectedOrder.customer.name}</p>
                <p className="text-[#657264]">{selectedOrder.customer.phone}</p>
                {selectedOrder.customer.email && (
                  <p className="text-[#657264]">{selectedOrder.customer.email}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-[#244c37] block">Fulfillment</span>
                <p className="capitalize font-semibold mt-0.5">
                  {selectedOrder.fulfillmentMethod === "pickup" ? "Store Pickup" : "Home Delivery"}
                </p>
                {selectedOrder.fulfillmentMethod === "pickup" ? (
                  <p className="text-[#657264]">
                    Slot: {selectedOrder.pickupDetails?.pickupDate} ({selectedOrder.pickupDetails?.pickupSlot})
                  </p>
                ) : (
                  <p className="text-[#657264]">
                    {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.area},{" "}
                    {selectedOrder.deliveryAddress?.city}
                  </p>
                )}
              </div>
            </div>

            {/* Items Summary */}
            <div className="mt-5 border-t border-[#244c37]/10 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
                Purchased Items ({selectedOrder.items.length})
              </span>
              <div className="mt-3 divide-y divide-[#244c37]/10 text-xs">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="font-medium">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="font-mono font-semibold">{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-[#244c37]/10 pt-2 text-sm font-bold">
                <span>Grand Total</span>
                <span className="font-serif text-lg">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Status & Fulfillment Controls */}
            <div className="mt-6 rounded-2xl border border-[#244c37]/20 p-5 space-y-4">
              <h3 className="font-serif text-lg font-bold">Update Order Status</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Lifecycle Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs font-semibold outline-none"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Payment Status
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified (Transfer Confirmed)</option>
                    <option value="paid">Paid (Collected in Full)</option>
                    <option value="failed">Failed / Rejected</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Status Update Note (Appears in Status History)
                  </label>
                  <input
                    type="text"
                    value={editStatusNote}
                    onChange={(e) => setEditStatusNote(e.target.value)}
                    placeholder="e.g. Fresh batch packed and ready for handover"
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Expected Delivery / Pickup Date
                  </label>
                  <input
                    type="date"
                    value={editExpectedDate}
                    onChange={(e) => setEditExpectedDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Customer-Visible Message
                  </label>
                  <input
                    type="text"
                    value={editCustomerNote}
                    onChange={(e) => setEditCustomerNote(e.target.value)}
                    placeholder="Message shown to customer on tracking screen"
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Internal Staff Notes (Private — Not shown to customer)
                  </label>
                  <textarea
                    rows={2}
                    value={editInternalNotes}
                    onChange={(e) => setEditInternalNotes(e.target.value)}
                    placeholder="Add internal kitchen or driver notes…"
                    className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-white px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving}
                className="w-full rounded-full bg-[#244c37] py-3 text-xs font-semibold text-white hover:bg-[#183724] disabled:opacity-50"
              >
                {saving ? "Saving Changes…" : "Save Order Changes"}
              </button>
            </div>

            {/* Audit Status History */}
            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
              <div className="mt-6 border-t border-[#244c37]/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
                  Status Audit Trail
                </span>
                <div className="mt-3 space-y-2 text-xs">
                  {selectedOrder.statusHistory.map((h, i) => (
                    <div key={i} className="rounded-xl bg-[#faf8f1] p-2.5">
                      <div className="flex justify-between font-semibold">
                        <span>{h.status}</span>
                        <span className="text-[#8b7857]">{h.actor}</span>
                      </div>
                      <p className="text-[11px] text-[#657264] mt-0.5">{h.note}</p>
                      <span className="text-[10px] text-[#8b7857] block mt-1">
                        {new Date(h.timestamp).toLocaleString("en-PK")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
