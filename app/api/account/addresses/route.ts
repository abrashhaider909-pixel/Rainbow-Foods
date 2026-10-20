import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { SavedAddress } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireAuth();
    const db = await getDb();
    const dbUser = await db.collection("users").findOne({ id: user.id });
    return NextResponse.json({ addresses: (dbUser?.savedAddresses as SavedAddress[]) || [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Home";
    const street = typeof body.street === "string" ? body.street.trim() : "";
    const area = typeof body.area === "string" ? body.area.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const isDefault = !!body.isDefault;

    if (!street || !city) {
      return NextResponse.json({ error: "Street address and city are required." }, { status: 400 });
    }

    const db = await getDb();
    const dbUser = await db.collection("users").findOne({ id: user.id });
    const currentAddresses: SavedAddress[] = (dbUser?.savedAddresses as SavedAddress[]) || [];

    const newAddress: SavedAddress = {
      id: body.id && typeof body.id === "string" ? body.id : randomUUID(),
      title,
      street,
      area,
      city,
      notes,
      isDefault: isDefault || currentAddresses.length === 0,
    };

    let updatedList: SavedAddress[];
    const existingIndex = currentAddresses.findIndex((a) => a.id === newAddress.id);
    if (existingIndex >= 0) {
      updatedList = currentAddresses.map((a) => (a.id === newAddress.id ? newAddress : isDefault ? { ...a, isDefault: false } : a));
    } else {
      updatedList = isDefault ? currentAddresses.map((a) => ({ ...a, isDefault: false })) : [...currentAddresses];
      updatedList.push(newAddress);
    }

    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { savedAddresses: updatedList, updatedAt: new Date().toISOString() } },
    );

    return NextResponse.json({ addresses: updatedList });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to save address." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("id");
    if (!addressId) return NextResponse.json({ error: "Address ID required" }, { status: 400 });

    const db = await getDb();
    const dbUser = await db.collection("users").findOne({ id: user.id });
    const currentAddresses: SavedAddress[] = (dbUser?.savedAddresses as SavedAddress[]) || [];

    const updated = currentAddresses.filter((a) => a.id !== addressId);
    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { savedAddresses: updated, updatedAt: new Date().toISOString() } },
    );

    return NextResponse.json({ addresses: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
