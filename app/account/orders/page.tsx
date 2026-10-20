import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ShoppingBag, Eye } from "lucide-react";
import type { Order } from "@/lib/types";


function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = await getDb();
  const orders = (await db
    .collection("orders")
    .find({ customerId: user.id })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as Order[];

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="border-b border-[#244c37]/10 pb-5">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">My Orders</h1>
        <p className="mt-1 text-sm text-[#657264]">
          View your complete order history, check payment verification, and track deliveries.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center text-[#657264]">
          <ShoppingBag size={48} className="mx-auto text-[#bd7d28]" />
          <h2 className="mt-4 font-serif text-2xl font-bold">No orders yet</h2>
          <p className="mt-1 text-sm">Treat yourself or your family to our freshly prepared menu items.</p>
          <Link
            href="/#products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#244c37] px-7 py-3 font-semibold text-white hover:bg-[#183724]"
          >
            Explore Menu
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.orderNumber}
              className="rounded-2xl border border-[#244c37]/10 bg-[#faf8f1] p-5 sm:p-6 transition hover:border-[#244c37]/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-xl font-bold">#{order.orderNumber}</span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        order.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "Cancelled"
                          ? "bg-red-100 text-red-800"
                          : order.status === "Payment Verification Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[#244c37] text-[#e8b75b]"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8b7857]">
                    Placed on {new Date(order.createdAt).toLocaleDateString("en-PK", { dateStyle: "long" })}
                  </p>
                </div>

                <div className="flex sm:flex-col sm:items-end justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-[#8b7857]">Total</span>
                  <span className="font-serif text-xl font-bold text-[#244c37]">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div className="py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8b7857] mb-2">
                  Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="rounded-xl bg-white px-3 py-1.5 border border-[#244c37]/10 font-medium"
                    >
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#244c37]/10 pt-4 text-xs">
                <div className="text-[#657264]">
                  <span>Fulfillment: </span>
                  <strong className="text-[#244c37]">
                    {order.fulfillmentMethod === "pickup" ? "Store Pickup" : "Home Delivery"}
                  </strong>
                  {" • "}
                  <span>Payment: </span>
                  <strong className="text-[#244c37]">
                    {order.paymentMethod === "cod"
                      ? "Cash on Delivery"
                      : order.paymentMethod === "cop"
                      ? "Cash on Pickup"
                      : "Online Transfer"}
                  </strong>
                </div>

                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-[#244c37] px-5 py-2 text-xs font-semibold text-white hover:bg-[#183724]"
                >
                  <Eye size={14} /> View & Track Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
