import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { authErr, AuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ihi_session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw authErr.invalidCreds();
    }

    const { role, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    if ((role as string) === "judge") {
      throw authErr.forbidden();
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password_hash, name, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[api/auth/login] Supabase query error:", error);
    }

    if (!user || !user.password_hash) {
      throw authErr.invalidCreds();
    }

    // 1. Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw authErr.invalidCreds();
    }

    // 2. Automatically update role in database if logging in via different role tab
    if (user.role !== role) {
      await supabase
        .from("users")
        .update({ role })
        .eq("id", user.id);
    }

    // 3. Prepare Session Claims
    const sessionUser = {
      sub: user.id,
      email: user.email,
      role: role as "participant" | "organizer" | "judge",
      name: user.name || user.email.split("@")[0],
    };

    const token = await signSession(sessionUser);
    await setSessionCookie(token);

    // 4. Force Set Cookie on Response Object
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("ihi_role", role, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set("ihi_user_name", sessionUser.name, { path: "/", maxAge: 60 * 60 * 24 * 7 });

    return response;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("[api/auth/login] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}