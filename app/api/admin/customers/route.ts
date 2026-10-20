import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Order, User } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const db = await getDb();
    const users = (await db
      .collection("users")
      .find({ role: "customer" }, { projection: { passwordHash: 0, _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as User[];

    const orders = (await db
      .collection("orders")
      .find({}, { projection: { customerId: 1, total: 1, status: 1, orderNumber: 1, createdAt: 1 } })
      .toArray()) as unknown as Order[];

    // Aggregate orders by customerId
    const customerOrderStats = new Map<string, { totalOrders: number; totalSpent: number; lastOrderDate: string }>();
    for (const o of orders) {
      if (!o.customerId) continue;
      const current = customerOrderStats.get(o.customerId) || { totalOrders: 0, totalSpent: 0, lastOrderDate: "" };
      current.totalOrders += 1;
      if (o.status !== "Cancelled") {
        current.totalSpent += o.total;
      }
      if (!current.lastOrderDate || new Date(o.createdAt).getTime() > new Date(current.lastOrderDate).getTime()) {
        current.lastOrderDate = o.createdAt;
      }
      customerOrderStats.set(o.customerId, current);
    }

    let customerList = users.map((u) => {
      const stats = customerOrderStats.get(u.id) || { totalOrders: 0, totalSpent: 0, lastOrderDate: "" };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        savedAddressesCount: u.savedAddresses?.length || 0,
        createdAt: u.createdAt,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      customerList = customerList.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }

    return NextResponse.json({ customers: customerList });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required." }, { status: 403 });
    }
    console.error("Customers error:", err);
    return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
  }
}
