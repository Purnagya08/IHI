import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function getAuthUser(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ihi_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const hackathonId = searchParams.get("hackathon_id");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const teamFilter = searchParams.get("team") || "all";
  const sortBy = searchParams.get("sort_by") || "registered_at";
  const sortOrder = searchParams.get("sort_order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  if (!hackathonId) {
    return NextResponse.json(
      { error: "hackathon_id is required" },
      { status: 400 }
    );
  }

  // Verify the requesting user is the organizer of this hackathon
  const { data: hackathon, error: hackErr } = await supabase
    .from("hackathons")
    .select("id, title, organizer_id")
    .eq("id", hackathonId)
    .single();

  if (hackErr || !hackathon) {
    return NextResponse.json(
      { error: "Hackathon not found" },
      { status: 404 }
    );
  }

  if (hackathon.organizer_id !== userId) {
    return NextResponse.json(
      { error: "You are not the organizer of this event" },
      { status: 403 }
    );
  }

  // Build the query for registrations with joined data
  let query = supabase
    .from("event_registrations")
    .select(
      `
      id,
      user_id,
      hackathon_id,
      team_id,
      role,
      status,
      registered_at,
      users!event_registrations_user_id_fkey (
        id,
        email
      ),
      profiles!event_registrations_user_id_fkey (
        full_name,
        avatar_url,
        bio,
        skills,
        college,
        phone,
        github,
        linkedin
      ),
      teams!event_registrations_team_id_fkey (
        id,
        name,
        invite_code
      )
    `,
      { count: "exact" }
    )
    .eq("hackathon_id", hackathonId);

  // Apply status filter
  if (status !== "all") {
    query = query.eq("status", status);
  }

  // Apply team filter
  if (teamFilter === "with_team") {
    query = query.not("team_id", "is", null);
  } else if (teamFilter === "without_team") {
    query = query.is("team_id", null);
  }

  // Apply sorting
  const validSortFields = ["registered_at", "status", "role"];
  const safeSortBy = validSortFields.includes(sortBy)
    ? sortBy
    : "registered_at";
  query = query.order(safeSortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: registrations, error: regErr, count } = await query;

  if (regErr) {
    console.error("Registration fetch error:", regErr);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }

  // Server-side search filtering (on name, email, college)
  let filtered = registrations || [];
  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter((r: any) => {
      const name = r.profiles?.full_name?.toLowerCase() || "";
      const email = r.users?.email?.toLowerCase() || "";
      const college = r.profiles?.college?.toLowerCase() || "";
      const teamName = r.teams?.name?.toLowerCase() || "";
      return (
        name.includes(s) ||
        email.includes(s) ||
        college.includes(s) ||
        teamName.includes(s)
      );
    });
  }

  // Get aggregate stats
  const { data: allRegs } = await supabase
    .from("event_registrations")
    .select("id, status, team_id")
    .eq("hackathon_id", hackathonId);

  const stats = {
    total: allRegs?.length || 0,
    confirmed: allRegs?.filter((r: any) => r.status === "confirmed").length || 0,
    pending: allRegs?.filter((r: any) => r.status === "pending").length || 0,
    rejected: allRegs?.filter((r: any) => r.status === "rejected").length || 0,
    with_team: allRegs?.filter((r: any) => r.team_id !== null).length || 0,
    without_team: allRegs?.filter((r: any) => r.team_id === null).length || 0,
  };

  // Get unique teams count
  const uniqueTeams = new Set(
    allRegs?.filter((r: any) => r.team_id).map((r: any) => r.team_id)
  );
  (stats as any).teams_count = uniqueTeams.size;

  return NextResponse.json({
    hackathon: {
      id: hackathon.id,
      title: hackathon.title,
    },
    registrations: filtered,
    stats,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}