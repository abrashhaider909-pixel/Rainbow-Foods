import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, createSession, getSessionCookieOptions } from "@/lib/auth";
import { validateEmail, validatePhoneNumber, normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phoneInput = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!name || name.length < 2 || name.length > 70) {
      return NextResponse.json({ error: "Please enter a valid full name (2-70 characters)." }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const phoneValidation = validatePhoneNumber(phoneInput);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error || "Invalid phone number." }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();
    const newUser = {
      id: userId,
      name,
      email,
      passwordHash,
      phone: phoneValidation.normalized,
      role: "customer" as const,
      mustChangePassword: false,
      savedAddresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("users").insertOne(newUser as unknown as Record<string, unknown>);

    const token = await createSession({
      id: userId,
      name,
      email,
      phone: phoneValidation.normalized,
      role: "customer",
    });

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json(
      {
        user: {
          id: userId,
          name,
          email,
          phone: phoneValidation.normalized,
          role: "customer",
        },
      },
      { status: 201 },
    );

    response.cookies.set(cookieOpts.name, token, cookieOpts);
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
