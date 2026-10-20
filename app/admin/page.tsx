"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";
import type { Order } from "@/lib/types";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  category: string;
}

interface AdminMetrics {
  ordersToday: number;
  todaySales: number;
  completedRevenue: number;
  unpaidOrPendingRevenue: number;
  pendingConfirmation: number;
  paymentVerificationPending: number;
  preparing: number;
  readyForPickup: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
  totalOrders: number;
  lowStockCount: number;
  lowStockProducts: LowStockItem[];
  recentOrders: Order[];
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setMetrics(data);
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

  function refreshMetrics() {
    setLoading(true);
    fetch("/api/admin/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMetrics(data);
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-12 text-center text-[#657264]">
        <h2 className="font-serif text-2xl font-bold">Loading live store metrics…</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Top Header */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Store Operations</h1>
            <p className="mt-1 text-sm text-[#657264]">
              Real-time MongoDB analytics, live kitchen orders, and sales performance.
            </p>
          </div>
          <button
            onClick={refreshMetrics}
            className="rounded-full border border-[#244c37]/20 px-5 py-2 text-xs font-semibold hover:bg-[#faf8f1]"
          >
            Refresh Metrics
          </button>
        </div>

        {/* Primary Metric Highlights */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              Today&apos;s Orders
            </span>
            <p className="mt-2 font-serif text-3xl font-bold">{metrics?.ordersToday ?? 0}</p>
            <span className="text-[11px] text-[#657264] mt-1 block">Placed today</span>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              Today&apos;s Sales Volume
            </span>
            <p className="mt-2 font-serif text-3xl font-bold text-[#244c37]">
              {formatPrice(metrics?.todaySales ?? 0)}
            </p>
            <span className="text-[11px] text-[#657264] mt-1 block">Active order value</span>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              Completed Revenue
            </span>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-800">
              {formatPrice(metrics?.completedRevenue ?? 0)}
            </p>
            <span className="text-[11px] text-emerald-700 mt-1 block">Fulfilled & paid</span>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              Pending / Unpaid
            </span>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-700">
              {formatPrice(metrics?.unpaidOrPendingRevenue ?? 0)}
            </p>
            <span className="text-[11px] text-amber-600 mt-1 block">COD / pending check</span>
          </div>
        </div>

        {/* Status Pipeline Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
          <div className="rounded-xl border border-[#244c37]/10 bg-white p-3">
            <span className="text-[10px] font-bold uppercase text-[#8b7857] block">Awaiting Confirmation</span>
            <span className="font-serif text-xl font-bold text-[#c98a35]">
              {metrics?.pendingConfirmation ?? 0}
            </span>
          </div>
          <div className="rounded-xl border border-[#244c37]/10 bg-white p-3">
            <span className="text-[10px] font-bold uppercase text-[#8b7857] block">Payment Verification</span>
            <span className="font-serif text-xl font-bold text-amber-600">
              {metrics?.paymentVerificationPending ?? 0}
            </span>
          </div>
          <div className="rounded-xl border border-[#244c37]/10 bg-white p-3">
            <span className="text-[10px] font-bold uppercase text-[#8b7857] block">Being Prepared</span>
            <span className="font-serif text-xl font-bold text-[#244c37]">
              {metrics?.preparing ?? 0}
            </span>
          </div>
          <div className="rounded-xl border border-[#244c37]/10 bg-white p-3">
            <span className="text-[10px] font-bold uppercase text-[#8b7857] block">Ready / In Transit</span>
            <span className="font-serif text-xl font-bold text-[#244c37]">
              {(metrics?.readyForPickup ?? 0) + (metrics?.outForDelivery ?? 0)}
            </span>
          </div>
          <div className="rounded-xl border border-[#244c37]/10 bg-white p-3">
            <span className="text-[10px] font-bold uppercase text-[#8b7857] block">Completed Orders</span>
            <span className="font-serif text-xl font-bold text-emerald-700">
              {metrics?.completed ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle size={24} />
            <h2 className="font-serif text-xl font-bold">
              Low Stock Alert ({metrics.lowStockProducts.length} items need restock)
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#6e572a]">
            The following items have dropped below your configured safety threshold. Update quantities in Product Management.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {metrics.lowStockProducts.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-amber-900 border border-amber-300 shadow-sm"
              >
                {p.name}: <strong className="text-red-700">{p.stock} units left</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#244c37]/10 pb-5">
          <h2 className="font-serif text-2xl font-bold">Recent Store Orders</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#bd7d28] hover:underline"
          >
            All Orders <ArrowRight size={14} />
          </Link>
        </div>

        {!metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-[#657264]">
            <Package size={40} className="mx-auto text-[#bd7d28]" />
            <p className="mt-3 font-serif text-lg font-bold">No orders recorded yet</p>
            <p className="mt-1 text-xs">Orders placed on the storefront will appear here live.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
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
                {metrics.recentOrders.map((o: Order) => (
                  <tr key={o.orderNumber} className="hover:bg-[#faf8f1] transition">
                    <td className="py-3.5 font-mono font-bold text-[#244c37]">#{o.orderNumber}</td>
                    <td className="py-3.5">
                      <p className="font-semibold text-sm">{o.customer.name}</p>
                      <p className="text-[#8b7857]">{o.customer.phone}</p>
                    </td>
                    <td className="py-3.5 capitalize">{o.fulfillmentMethod}</td>
                    <td className="py-3.5 font-semibold text-sm">{formatPrice(o.total)}</td>
                    <td className="py-3.5">
                      <span className="capitalize">{o.paymentMethod}</span>
                      <span
                        className={`ml-1.5 inline-block h-2 w-2 rounded-full ${
                          o.paymentStatus === "paid" || o.paymentStatus === "verified"
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                        }`}
                        title={o.paymentStatus}
                      />
                    </td>
                    <td className="py-3.5">
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
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/admin/orders?inspect=${o.orderNumber}`}
                        className="rounded-full bg-[#244c37] px-3.5 py-1.5 font-semibold text-white hover:bg-[#183724]"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
