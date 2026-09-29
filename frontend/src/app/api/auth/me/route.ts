export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const userId = session.sub;
  let dbName: string | null = null;
  let dbEmail: string | null = null;
  let dbAvatar: string | null = null;
  let dbUsername: string | null = null;
  let dbFullName: string | null = null;

  try {
    const supabase = await createClient();

    // Primary: users table
    const { data: userRow } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, github_username")
      .eq("id", userId)
      .maybeSingle();

    if (userRow) {
      dbFullName = userRow.full_name ?? null;
      dbEmail = userRow.email ?? null;
      dbAvatar = userRow.avatar_url ?? null;
      dbUsername = userRow.github_username ?? null;
      dbName = userRow.full_name ?? null;
    }

    // Secondary: profiles table (if used)
    if (!dbName || !dbUsername) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profileRow) {
        dbFullName = dbFullName ?? profileRow.full_name ?? null;
        dbName = dbName ?? profileRow.full_name ?? null;
        dbUsername = dbUsername ?? profileRow.username ?? null;
        dbEmail = dbEmail ?? profileRow.email ?? null;
        dbAvatar = dbAvatar ?? profileRow.avatar_url ?? null;
      }
    }
  } catch (err) {
    console.error("[auth/me] DB enrich failed:", err);
  }

  const email = dbEmail || session.email || "";
  const name =
    dbFullName ||
    dbName ||
    session.name ||
    (email ? email.split("@")[0] : "HACKER");

  const username =
    dbUsername ||
    (email ? email.split("@")[0] : "hacker");

  return NextResponse.json({
    user: {
      id: userId,
      sub: userId,
      email,
      role: session.role,
      name,
      full_name: name,
      username,
      avatar_url: dbAvatar,
      eventId: session.eventId,
    },
  });
}