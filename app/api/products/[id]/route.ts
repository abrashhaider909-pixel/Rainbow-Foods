import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import type { Product, ProductCategory } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const db = await getDb();
    const product = await db.collection("products").findOne({ id: numericId }, { projection: { _id: 0 } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection("products").findOne({ id: numericId });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : (existing.name as string);
    const description = typeof body.description === "string" ? body.description.trim() : (existing.description as string);
    const category = (body.category as ProductCategory) || (existing.category as ProductCategory);
    const price = typeof body.price === "number" ? Math.max(0, body.price) : (existing.price as number);
    const salePrice = typeof body.salePrice === "number" && body.salePrice > 0 ? body.salePrice : null;
    const stock = typeof body.stock === "number" ? Math.max(0, body.stock) : (existing.stock as number);
    const image = typeof body.image === "string" && body.image.trim() ? body.image.trim() : (existing.image as string);
    const tag = typeof body.tag === "string" ? body.tag.trim() : (existing.tag as string) || "";
    const isActive = typeof body.isActive === "boolean" ? body.isActive : (existing.isActive as boolean);

    const discountPercent =
      salePrice && salePrice < price ? Math.round(((price - salePrice) / price) * 100) : null;

    const updatedFields: Partial<Product> = {
      name,
      description,
      category,
      price,
      salePrice,
      discountPercent,
      stock,
      image,
      tag: tag || (discountPercent ? `Sale ${discountPercent}% off` : undefined),
      isActive,
      updatedAt: new Date().toISOString(),
    };

    await db.collection("products").updateOne({ id: numericId }, { $set: updatedFields });

    const updated = await db.collection("products").findOne({ id: numericId }, { projection: { _id: 0 } });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const db = await getDb();
    // Check if product is in any existing orders
    const inOrders = await db.collection("orders").findOne({ "items.productId": numericId });

    if (inOrders) {
      // Safe archive: deactivate rather than hard delete to preserve historical integrity
      await db.collection("products").updateOne(
        { id: numericId },
        { $set: { isActive: false, updatedAt: new Date().toISOString() } },
      );
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Product is referenced in existing orders and was safely archived/deactivated.",
      });
    }

    await db.collection("products").deleteOne({ id: numericId });
    return NextResponse.json({ success: true, message: "Product deleted." });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
