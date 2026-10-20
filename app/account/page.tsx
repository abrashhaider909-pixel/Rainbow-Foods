import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ShoppingBag, ArrowRight } from "lucide-react";
import type { Order, User } from "@/lib/types";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = await getDb();
  const dbUser = (await db.collection("users").findOne({ id: user.id })) as unknown as User;
  const orders = (await db
    .collection("orders")
    .find({ customerId: user.id })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as Order[];

  const activeOrders = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status));
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">
          Hello, {user.name.split(" ")[0]}!
        </h1>
        <p className="mt-2 text-sm text-[#657264]">
          Welcome to your Rainbow Foods customer dashboard. Track your active food orders, manage
          saved delivery locations, and view your order history.
        </p>

        {/* Quick Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs uppercase tracking-wider text-[#8b7857]">Total Orders</span>
            <p className="mt-2 font-serif text-3xl font-bold">{orders.length}</p>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs uppercase tracking-wider text-[#8b7857]">Active Orders</span>
            <p className="mt-2 font-serif text-3xl font-bold text-[#c98a35]">
              {activeOrders.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-5 border border-[#244c37]/10">
            <span className="text-xs uppercase tracking-wider text-[#8b7857]">Saved Addresses</span>
            <p className="mt-2 font-serif text-3xl font-bold">
              {dbUser?.savedAddresses?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#244c37]/10 pb-5">
          <h2 className="font-serif text-2xl font-bold">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#bd7d28] hover:underline"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-[#657264]">
            <ShoppingBag size={40} className="mx-auto text-[#bd7d28]" />
            <p className="mt-3 font-serif text-lg font-bold">No orders placed yet</p>
            <p className="mt-1 text-xs">Explore our traditional sweets and savoury treats to order today.</p>
            <Link
              href="/#products"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#244c37] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#183724]"
            >
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.orderNumber}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#244c37]/10 bg-[#faf8f1] p-5 transition hover:border-[#244c37]/30"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg font-bold">#{order.orderNumber}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        order.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "Cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-[#244c37] text-[#e8b75b]"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#657264]">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"} • {formatPrice(order.total)} •{" "}
                    {order.fulfillmentMethod === "pickup" ? "Store Pickup" : "Home Delivery"}
                  </p>
                </div>

                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#244c37] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#183724]"
                >
                  Track Order <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
