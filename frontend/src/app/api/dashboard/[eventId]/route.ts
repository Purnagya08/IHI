import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!isValidUUID(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const [
    { count: regCount },
    { count: teamCount },
    { count: lookingCount },
    { count: draftCount },
    { count: finalCount },
    { count: submittedCount },
    { data: event, error: eventErr },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("looking_for_team")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "draft"),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["final", "locked", "submitted"]),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "submitted"),
    supabase
      .from("events")
      .select("id, name, max_participants, submission_deadline")
      .eq("id", eventId)
      .single(),
  ]);

  if (eventErr || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const counts = {
    reg: regCount ?? 0,
    teams: teamCount ?? 0,
    solo: lookingCount ?? 0,
    drafts: draftCount ?? 0,
    finals: finalCount ?? 0,
    submitted: submittedCount ?? 0,
  };

  const capacity = event.max_participants ?? null;
  const utilizationPercent =
    capacity !== null && capacity > 0
      ? Math.round((counts.reg / capacity) * 1000) / 10
      : null;

  const completionPercent =
    counts.teams > 0
      ? Math.round((counts.finals / counts.teams) * 1000) / 10
      : 0;

  // members in teams ≈ reg - looking (best effort without team_id on registrations)
  const totalParticipantsInTeams = Math.max(counts.reg - counts.solo, 0);

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      maxParticipants: capacity,
      submissionDeadline: event.submission_deadline,
    },
    registration: {
      total: counts.reg,
      capacity,
      utilizationPercent,
    },
    teams: {
      totalTeams: counts.teams,
      soloLookingCount: counts.solo,
      totalParticipantsInTeams,
    },
    submissions: {
      draftCount: counts.drafts,
      finalCount: counts.finals,
      totalTeams: counts.teams,
      completionPercent,
    },
    serverTime: new Date().toISOString(),
  });
}