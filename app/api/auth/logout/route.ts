import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await destroySession(token);
    }

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({ success: true });
    response.cookies.delete(cookieOpts.name);
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
