import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
import { getDb } from "@/lib/mongodb";
import { verifyPassword, createSession, getSessionCookieOptions } from "@/lib/auth";
import { normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Please provide both email and password." }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash as string);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSession({
      id: user.id as string,
      name: user.name as string,
      email: user.email as string,
      phone: (user.phone as string) || "",
      role: (user.role as UserRole) || "customer",
      mustChangePassword: !!user.mustChangePassword,
    });

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        mustChangePassword: !!user.mustChangePassword,
      },
    });

    response.cookies.set(cookieOpts.name, token, cookieOpts);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
