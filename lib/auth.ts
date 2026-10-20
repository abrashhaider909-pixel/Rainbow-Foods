import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./mongodb";
import type { SessionUser, UserRole } from "./types";

export const SESSION_COOKIE_NAME = "rainbow_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
  mustChangePassword?: boolean;
}): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await db.collection("sessions").insertOne({
    token,
    userId: user.id,
    role: user.role,
    email: user.email.toLowerCase(),
    name: user.name,
    phone: user.phone,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  return token;
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection("sessions").findOne({ token });
  if (!session) return null;

  // Check expiration
  if (session.expiresAt && new Date(session.expiresAt as string).getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ token });
    return null;
  }

  // Also query user to get latest profile updates & check if still active
  const user = await db.collection("users").findOne({ id: session.userId });
  if (!user) {
    return {
      id: session.userId as string,
      name: session.name as string,
      email: session.email as string,
      phone: (session.phone as string) || "",
      role: (session.role as UserRole) || "customer",
      mustChangePassword: !!session.mustChangePassword,
    };
  }

  return {
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    phone: (user.phone as string) || "",
    role: (user.role as UserRole) || "customer",
    mustChangePassword: !!user.mustChangePassword,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await getSessionUser(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  const db = await getDb();
  await db.collection("sessions").deleteOne({ token });
}

export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
