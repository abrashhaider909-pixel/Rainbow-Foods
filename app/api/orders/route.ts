import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

type SubmittedItem = { productId: number; quantity: number };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const data = body as { customer?: { name?: unknown; phone?: unknown; address?: unknown }; items?: unknown };
  const name = typeof data?.customer?.name === "string" ? data.customer.name.trim() : "";
  const phone = typeof data?.customer?.phone === "string" ? data.customer.phone.trim() : "";
  const address = typeof data?.customer?.address === "string" ? data.customer.address.trim() : "";
  if (!name || name.length > 100 || !phone || phone.length > 30 || !address || address.length > 500) {
    return NextResponse.json({ error: "Enter a name, phone number, and address within the allowed lengths." }, { status: 400 });
  }
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 25) {
    return NextResponse.json({ error: "An order must contain between 1 and 25 products." }, { status: 400 });
  }
  const items = data.items as SubmittedItem[];
  if (items.some((item) => !item || !Number.isSafeInteger(item.productId) || item.productId < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) || new Set(items.map((item) => item.productId)).size !== items.length) {
    return NextResponse.json({ error: "Order items are invalid. Please review your basket." }, { status: 400 });
  }

  try {
    const client = await getMongoClient();
    const database = client.db("rainbow_rewri");
    const products = await database.collection("products")
      .find({ id: { $in: items.map((item) => item.productId) } }, { projection: { _id: 0, id: 1, name: 1, price: 1 } })
      .toArray();
    if (products.length !== items.length || products.some((product) => typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0)) {
      return NextResponse.json({ error: "One or more products are no longer available. Refresh the menu and try again." }, { status: 409 });
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    const orderItems = items.map((item) => {
      const product = byId.get(item.productId)!;
      return { productId: product.id, name: product.name, unitPrice: product.price, quantity: item.quantity, lineTotal: product.price * item.quantity };
    });
    const orderNumber = randomUUID();
    await database.collection("orders").insertOne({
      orderNumber,
      customer: { name, phone, address },
      items: orderItems,
      subtotal: orderItems.reduce((sum, item) => sum + item.lineTotal, 0),
      status: "manual_request",
      paymentStatus: "not_collected",
      createdAt: new Date(),
    });
    return NextResponse.json({ orderNumber }, { status: 201 });
  } catch (error) {
    const diagnostic = error as { name?: string; code?: string | number; codeName?: string };
    console.error("Manual order save failed", {
      name: diagnostic?.name ?? "UnknownError",
      code: diagnostic?.code,
      codeName: diagnostic?.codeName,
    });
    return NextResponse.json({ error: "We could not save the order request. Please try again later." }, { status: 503 });
  }
}
