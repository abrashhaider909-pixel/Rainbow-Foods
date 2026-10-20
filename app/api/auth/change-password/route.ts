import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
    }

    const db = await getDb();
    const dbUser = await db.collection("users").findOne({ id: user.id });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify current password unless mustChangePassword is true and they are changing initial password
    if (currentPassword) {
      const match = await verifyPassword(currentPassword, dbUser.passwordHash as string);
      if (!match) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    } else if (!user.mustChangePassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.collection("users").updateOne(
      { id: user.id },
      {
        $set: {
          passwordHash: newHash,
          mustChangePassword: false,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    // Also update session if stored
    await db.collection("sessions").updateOne(
      { userId: user.id },
      { $set: { mustChangePassword: false } },
    );

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
