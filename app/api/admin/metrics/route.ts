import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Order, Product, StoreSettings } from "@/lib/types";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();

    const orders = (await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Order[];

    const products = (await db
      .collection("products")
      .find({})
      .toArray()) as unknown as Product[];

    const settings = (await db
      .collection("storeSettings")
      .findOne({ key: "general" })) as unknown as StoreSettings;

    const lowStockThreshold = settings?.lowStockThreshold ?? 5;

    // Today's start in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    let ordersToday = 0;
    let pendingConfirmation = 0;
    let preparing = 0;
    let readyForPickup = 0;
    let outForDelivery = 0;
    let completed = 0;
    let cancelled = 0;
    let paymentVerificationPending = 0;

    let todaySales = 0; // Total sales volume for orders placed today (excluding cancelled)
    let completedRevenue = 0; // Total revenue from completed orders
    let unpaidOrPendingRevenue = 0; // Revenue from active orders that are not yet marked paid

    for (const order of orders) {
      const orderTime = new Date(order.createdAt).getTime();
      const isToday = orderTime >= todayStartTime;

      if (isToday) {
        ordersToday++;
        if (order.status !== "Cancelled") {
          todaySales += order.total;
        }
      }

      if (order.status === "Pending") pendingConfirmation++;
      else if (order.status === "Payment Verification Pending") paymentVerificationPending++;
      else if (order.status === "Preparing") preparing++;
      else if (order.status === "Ready for Pickup") readyForPickup++;
      else if (order.status === "Out for Delivery") outForDelivery++;
      else if (order.status === "Completed") {
        completed++;
        completedRevenue += order.total;
      } else if (order.status === "Cancelled") {
        cancelled++;
      }

      // Track unpaid / pending payment
      if (order.status !== "Cancelled" && order.status !== "Completed" && order.paymentStatus !== "paid") {
        unpaidOrPendingRevenue += order.total;
      }
    }

    const lowStockProducts = products
      .filter((p) => p.isActive && p.stock <= lowStockThreshold)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        category: p.category,
      }));

    return NextResponse.json({
      ordersToday,
      todaySales,
      completedRevenue,
      unpaidOrPendingRevenue,
      pendingConfirmation,
      paymentVerificationPending,
      preparing,
      readyForPickup,
      outForDelivery,
      completed,
      cancelled,
      totalOrders: orders.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentOrders: orders.slice(0, 8),
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required." }, { status: 403 });
    }
    console.error("Metrics error:", err);
    return NextResponse.json({ error: "Failed to load metrics." }, { status: 500 });
  }
}
