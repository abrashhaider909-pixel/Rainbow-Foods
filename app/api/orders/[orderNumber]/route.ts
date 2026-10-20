import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      return NextResponse.json({ error: "Order number required." }, { status: 400 });
    }

    const db = await getDb();
    const order = (await db.collection("orders").findOne({ orderNumber })) as unknown as Order;
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const user = await getCurrentUser();

    // Security check: Customer can only view their own order
    if (order.customerId) {
      if (!user || (user.id !== order.customerId && user.role !== "admin")) {
        return NextResponse.json({ error: "Unauthorized to view this order." }, { status: 403 });
      }
    }

    // Hide internalNotes if customer is viewing
    if (!user || user.role !== "admin") {
      const customerViewableOrder = { ...order };
      delete customerViewableOrder.internalNotes;
      return NextResponse.json(customerViewableOrder);
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch order details." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const user = await requireAdmin();
    const { orderNumber } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const db = await getDb();
    const order = (await db.collection("orders").findOne({ orderNumber })) as unknown as Order;
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const updates: Partial<Order> = {};
    const nowIso = new Date().toISOString();
    let historyEntryAdded = false;

    // Status transition
    if (body.status && body.status !== order.status) {
      const newStatus = body.status as OrderStatus;
      updates.status = newStatus;

      const history = [...(order.statusHistory || [])];
      history.push({
        status: newStatus,
        timestamp: nowIso,
        note: typeof body.statusNote === "string" ? body.statusNote : `Status updated to ${newStatus}`,
        actor: `Admin: ${user.name}`,
      });
      updates.statusHistory = history;
      historyEntryAdded = true;
    }

    // Payment verification / status
    if (body.paymentStatus && body.paymentStatus !== order.paymentStatus) {
      updates.paymentStatus = body.paymentStatus as PaymentStatus;
      if (body.paymentStatus === "verified" || body.paymentStatus === "paid") {
        updates.paymentDetails = {
          ...(order.paymentDetails || {}),
          verifiedAt: nowIso,
          verifiedBy: user.name,
        };
      }
    }

    if (typeof body.expectedDate === "string") {
      updates.expectedDate = body.expectedDate.trim();
    }

    if (typeof body.internalNotes === "string") {
      updates.internalNotes = body.internalNotes;
    }

    if (typeof body.customerNote === "string") {
      updates.customerNote = body.customerNote;
      if (!historyEntryAdded && body.customerNote.trim()) {
        const history = [...(order.statusHistory || updates.statusHistory || [])];
        history.push({
          status: updates.status || order.status,
          timestamp: nowIso,
          note: `Update from store: ${body.customerNote}`,
          actor: `Admin: ${user.name}`,
        });
        updates.statusHistory = history;
      }
    }

    updates.updatedAt = nowIso;

    await db.collection("orders").updateOne({ orderNumber }, { $set: updates });

    const updatedOrder = await db.collection("orders").findOne({ orderNumber });
    return NextResponse.json(updatedOrder);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required." }, { status: 403 });
    }
    console.error("Order patch error:", err);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}
