import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import type { Product, ProductCategory } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const showAll = searchParams.get("all") === "true";

    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === "admin";

    const db = await getDb();
    const filter: Record<string, unknown> = {};

    // Non-admins only see active products
    if (!showAll || !isAdmin) {
      filter.isActive = true;
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const products = (await db
      .collection("products")
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()) as unknown as Product[];

    // If search term provided
    let results = products;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    return NextResponse.json(results, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = body.category as ProductCategory;
    const price = typeof body.price === "number" ? Math.max(0, body.price) : 0;
    const salePrice = typeof body.salePrice === "number" && body.salePrice > 0 ? body.salePrice : null;
    const stock = typeof body.stock === "number" ? Math.max(0, body.stock) : 0;
    const image = typeof body.image === "string" && body.image.trim()
      ? body.image.trim()
      : "https://images.unsplash.com/photo-1605197161470-5d2c3a6e7a94?auto=format&fit=crop&w=900&q=85";
    const tag = typeof body.tag === "string" ? body.tag.trim() : "";
    const isActive = body.isActive !== false;

    if (!name || !price || !category) {
      return NextResponse.json({ error: "Name, price, and category are required." }, { status: 400 });
    }

    const db = await getDb();
    // Get next ID
    const allProducts = (await db
      .collection("products")
      .find({}, { projection: { id: 1 } })
      .sort({ id: -1 })
      .limit(1)
      .toArray()) as unknown as { id: number }[];
    const nextId = allProducts.length > 0 ? allProducts[0].id + 1 : 1;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${nextId}`;

    const discountPercent =
      salePrice && salePrice < price ? Math.round(((price - salePrice) / price) * 100) : null;

    const newProduct: Product = {
      id: nextId,
      slug,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("products").insertOne(newProduct as unknown as Record<string, unknown>);
    return NextResponse.json(newProduct, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
