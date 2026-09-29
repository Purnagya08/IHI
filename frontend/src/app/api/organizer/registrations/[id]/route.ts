import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function getAuthUser() {
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

// GET single registration detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: registration, error } = await supabase
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
        email,
        created_at
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
        invite_code,
        created_by
      ),
      hackathons!event_registrations_hackathon_id_fkey (
        id,
        title,
        organizer_id
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !registration) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 }
    );
  }

  // Verify organizer
  if ((registration as any).hackathons?.organizer_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get team members if in a team
  let teamMembers: any[] = [];
  if (registration.team_id) {
    const { data: members } = await supabase
      .from("event_registrations")
      .select(
        `
        id,
        user_id,
        role,
        status,
        profiles!event_registrations_user_id_fkey (
          full_name,
          avatar_url,
          college
        ),
        users!event_registrations_user_id_fkey (
          email
        )
      `
      )
      .eq("team_id", registration.team_id)
      .eq("hackathon_id", registration.hackathon_id);

    teamMembers = members || [];
  }

  return NextResponse.json({
    registration,
    team_members: teamMembers,
  });
}

// PATCH — update registration status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  const validStatuses = ["pending", "confirmed", "rejected", "waitlisted"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Get registration + verify organizer
  const { data: reg } = await supabase
    .from("event_registrations")
    .select(
      `
      id,
      hackathon_id,
      hackathons!event_registrations_hackathon_id_fkey (
        organizer_id
      )
    `
    )
    .eq("id", id)
    .single();

  if (!reg) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 }
    );
  }

  if ((reg as any).hackathons?.organizer_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("event_registrations")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }

  return NextResponse.json({ registration: updated });
}