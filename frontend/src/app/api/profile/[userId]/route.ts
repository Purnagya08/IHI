import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: rawId } = await params;
    const supabase = await createClient();
    const session = await getSession();

    // Resolve "me" to the logged-in JWT user
    let userId = rawId;
    if (!userId || userId === "me" || userId === "demo") {
      if (!session?.sub) {
        return NextResponse.json(
          { ok: false, error: "Not authenticated", data: null },
          { status: 401 }
        );
      }
      userId = session.sub;
    }

    // 1) users table
    const { data: userRow } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, github_username, bio, skills, created_at")
      .eq("id", userId)
      .maybeSingle();

    // 2) profiles table (optional enrichment)
    const { data: profileRow } = await supabase
      .from("profiles")
      .select(
        "id, full_name, username, bio, avatar_url, location, created_at, github_url, linkedin_url, website_url, rank, points, streak_days, hackathons_won, hackathons_attended, skills"
      )
      .eq("id", userId)
      .maybeSingle();

    // 3) participant_profiles (optional)
    const { data: participantRow } = await supabase
      .from("participant_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!userRow && !profileRow && !participantRow) {
      // Absolute empty — no demo fake user
      return NextResponse.json({
        ok: true,
        data: {
          id: userId,
          user_id: userId,
          username: null,
          display_name: null,
          full_name: null,
          email: null,
          bio: null,
          avatar_url: null,
          location: null,
          github_url: null,
          linkedin_url: null,
          website_url: null,
          portfolio_url: null,
          skills: [],
          tech_stack: [],
          rank: 0,
          points: 0,
          streak_days: 0,
          hackathons_won: 0,
          hackathons_attended: 0,
          hackathons_participated: 0,
          created_at: null,
        },
      });
    }

    const fullName =
      profileRow?.full_name ||
      userRow?.full_name ||
      (participantRow as any)?.display_name ||
      null;

    const username =
      profileRow?.username ||
      userRow?.github_username ||
      (participantRow as any)?.username ||
      (userRow?.email ? userRow.email.split("@")[0] : null);

    const data = {
      id: userId,
      user_id: userId,
      username,
      display_name: fullName,
      full_name: fullName,
      email: userRow?.email || (profileRow as any)?.email || null,
      bio: profileRow?.bio || userRow?.bio || (participantRow as any)?.bio || null,
      avatar_url:
        profileRow?.avatar_url ||
        userRow?.avatar_url ||
        (participantRow as any)?.avatar_url ||
        null,
      location: profileRow?.location || null,
      github_url:
        profileRow?.github_url ||
        (participantRow as any)?.github_url ||
        (userRow?.github_username
          ? `https://github.com/${userRow.github_username}`
          : null),
      linkedin_url:
        profileRow?.linkedin_url || (participantRow as any)?.linkedin_url || null,
      website_url:
        profileRow?.website_url || (participantRow as any)?.portfolio_url || null,
      portfolio_url: (participantRow as any)?.portfolio_url || null,
      skills:
        profileRow?.skills ||
        userRow?.skills ||
        (participantRow as any)?.tech_stack ||
        [],
      tech_stack: (participantRow as any)?.tech_stack || profileRow?.skills || [],
      rank: profileRow?.rank || (participantRow as any)?.rating || 0,
      points: profileRow?.points || 0,
      streak_days: profileRow?.streak_days || 0,
      hackathons_won:
        profileRow?.hackathons_won || (participantRow as any)?.hackathons_won || 0,
      hackathons_attended:
        profileRow?.hackathons_attended ||
        (participantRow as any)?.hackathons_participated ||
        0,
      hackathons_participated:
        (participantRow as any)?.hackathons_participated ||
        profileRow?.hackathons_attended ||
        0,
      created_at:
        profileRow?.created_at ||
        userRow?.created_at ||
        (participantRow as any)?.created_at ||
        null,
    };

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load profile", data: null },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: rawId } = await params;
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let userId = rawId;
    if (!userId || userId === "me") userId = session.sub;

    // Only allow editing own profile
    if (userId !== session.sub) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.headline !== undefined) updates.headline = body.headline;
    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.username !== undefined) updates.username = body.username;
    if (body.location !== undefined) updates.location = body.location;
    if (body.github_url !== undefined) updates.github_url = body.github_url;
    if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url;
    if (body.website_url !== undefined) updates.website_url = body.website_url;
    if (body.portfolio_url !== undefined) updates.portfolio_url = body.portfolio_url;
    if (Array.isArray(body.tech_stack)) updates.tech_stack = body.tech_stack;
    if (Array.isArray(body.skills)) updates.skills = body.skills;

    // Try profiles first, then participant_profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (profileData) {
      return NextResponse.json({ ok: true, data: profileData });
    }

    const { data: participantData } = await supabase
      .from("participant_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      data: participantData || updates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}