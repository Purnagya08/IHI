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

export async function GET(req: NextRequest) {
  const userId = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const hackathonId = searchParams.get("hackathon_id");

  if (!hackathonId) {
    return NextResponse.json(
      { error: "hackathon_id is required" },
      { status: 400 }
    );
  }

  // Verify organizer
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("id, organizer_id, title")
    .eq("id", hackathonId)
    .single();

  if (!hackathon || hackathon.organizer_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(
      `
      id,
      role,
      status,
      registered_at,
      users!event_registrations_user_id_fkey (
        email
      ),
      profiles!event_registrations_user_id_fkey (
        full_name,
        college,
        phone,
        skills,
        github,
        linkedin
      ),
      teams!event_registrations_team_id_fkey (
        name
      )
    `
    )
    .eq("hackathon_id", hackathonId)
    .order("registered_at", { ascending: true });

  // Build CSV
  const headers = [
    "S.No",
    "Name",
    "Email",
    "College",
    "Phone",
    "Skills",
    "Team",
    "Role",
    "Status",
    "GitHub",
    "LinkedIn",
    "Registered At",
  ];

  const rows = (registrations || []).map((r: any, i: number) => [
    i + 1,
    r.profiles?.full_name || "N/A",
    r.users?.email || "N/A",
    r.profiles?.college || "N/A",
    r.profiles?.phone || "N/A",
    Array.isArray(r.profiles?.skills)
      ? r.profiles.skills.join("; ")
      : r.profiles?.skills || "N/A",
    r.teams?.name || "No Team",
    r.role || "participant",
    r.status || "pending",
    r.profiles?.github || "N/A",
    r.profiles?.linkedin || "N/A",
    r.registered_at
      ? new Date(r.registered_at).toLocaleString()
      : "N/A",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row: any[]) =>
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${hackathon.title.replace(/[^a-zA-Z0-9]/g, "_")}_registrations.csv"`,
    },
  });
}