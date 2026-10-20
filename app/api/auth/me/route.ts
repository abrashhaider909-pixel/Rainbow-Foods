import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { SavedAddress } from "@/lib/types";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ user: null });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ id: sessionUser.id });

  return NextResponse.json({
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      phone: sessionUser.phone,
      role: sessionUser.role,
      mustChangePassword: sessionUser.mustChangePassword,
      savedAddresses: (user?.savedAddresses as SavedAddress[]) || [],
    },
  });
}
