import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_STORE_SETTINGS } from "@/lib/constants";
import type { StoreSettings } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection("storeSettings").findOne({ key: "general" });
    if (!settings) {
      return NextResponse.json(DEFAULT_STORE_SETTINGS);
    }
    const safeSettings = { ...settings } as Record<string, unknown>;
    delete safeSettings._id;
    return NextResponse.json(safeSettings);
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(DEFAULT_STORE_SETTINGS);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const updatedSettings: StoreSettings = {
      storeName: body.storeName || DEFAULT_STORE_SETTINGS.storeName,
      storePhone: body.storePhone || DEFAULT_STORE_SETTINGS.storePhone,
      pickupAddress: body.pickupAddress || DEFAULT_STORE_SETTINGS.pickupAddress,
      pickupInstructions: body.pickupInstructions || DEFAULT_STORE_SETTINGS.pickupInstructions,
      pickupDays: Array.isArray(body.pickupDays) ? body.pickupDays : DEFAULT_STORE_SETTINGS.pickupDays,
      pickupTimeSlots: Array.isArray(body.pickupTimeSlots) ? body.pickupTimeSlots : DEFAULT_STORE_SETTINGS.pickupTimeSlots,
      deliveryFee: typeof body.deliveryFee === "number" ? Math.max(0, body.deliveryFee) : DEFAULT_STORE_SETTINGS.deliveryFee,
      freeDeliveryThreshold: typeof body.freeDeliveryThreshold === "number" ? Math.max(0, body.freeDeliveryThreshold) : DEFAULT_STORE_SETTINGS.freeDeliveryThreshold,
      deliveryAreas: Array.isArray(body.deliveryAreas) ? body.deliveryAreas : DEFAULT_STORE_SETTINGS.deliveryAreas,
      bankDetails: {
        bankName: body.bankDetails?.bankName || DEFAULT_STORE_SETTINGS.bankDetails.bankName,
        accountTitle: body.bankDetails?.accountTitle || DEFAULT_STORE_SETTINGS.bankDetails.accountTitle,
        accountNumber: body.bankDetails?.accountNumber || DEFAULT_STORE_SETTINGS.bankDetails.accountNumber,
        iban: body.bankDetails?.iban || DEFAULT_STORE_SETTINGS.bankDetails.iban,
        jazzCashNumber: body.bankDetails?.jazzCashNumber ?? DEFAULT_STORE_SETTINGS.bankDetails.jazzCashNumber,
        easyPaisaNumber: body.bankDetails?.easyPaisaNumber ?? DEFAULT_STORE_SETTINGS.bankDetails.easyPaisaNumber,
        instructions: body.bankDetails?.instructions || DEFAULT_STORE_SETTINGS.bankDetails.instructions,
      },
      lowStockThreshold: typeof body.lowStockThreshold === "number" ? Math.max(1, body.lowStockThreshold) : DEFAULT_STORE_SETTINGS.lowStockThreshold,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection("storeSettings").updateOne(
      { key: "general" },
      { $set: { ...updatedSettings, key: "general" } },
      { upsert: true },
    );

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    console.error("Save settings error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
