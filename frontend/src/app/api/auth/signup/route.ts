import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/auth/schemas";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // Required for bcryptjs

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ihi_session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Please check your details." },
        { status: 400 }
      );
    }

    const { role, name, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const supabase = await createClient();

    // 1. Check if email already exists in Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 2. Hash the password
    const password_hash = await hashPassword(password);

    // 3. Save User to Supabase
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ email, password_hash, name, role })
      .select("id, email, name, role")
      .single();

    if (insertError || !newUser) {
      console.error("[api/auth/signup] DB Insert Error:", insertError);
      return NextResponse.json({ error: "Failed to create account in database." }, { status: 500 });
    }

    // 4. Issue JWT Session
    const sessionUser = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role as "participant" | "organizer",
      name: newUser.name,
    };

    const token = await signSession(sessionUser);
    await setSessionCookie(token);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    // 5. Set UI Hydration Cookies
    response.cookies.set("ihi_role", newUser.role, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set("ihi_user_name", newUser.name, { path: "/", maxAge: 60 * 60 * 24 * 7 });

    return response;
  } catch (err) {
    console.error("[api/auth/signup] Unexpected error:", err);
    return NextResponse.json({ error: "Signup failed due to an unexpected error." }, { status: 500 });
  }
}