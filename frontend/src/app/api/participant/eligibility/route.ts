import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session?.sub;

    if (!userId) {
      return NextResponse.json({
        registered: false,
        inTeam: false,
        registrationCount: 0,
        teamCount: 0,
        primaryEventId: null,
        canSubmit: false,
      });
    }

    // Must be the same user as JWT (or public self-check)
    if (session?.sub && session.sub !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();

    // Registrations — try event_registrations then registrations
    let regs: Array<{ event_id: string }> = [];
    {
      const { data } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", userId);
      if (data) regs = data;
      else {
        const { data: alt } = await supabase
          .from("registrations")
          .select("event_id")
          .eq("user_id", userId);
        if (alt) regs = alt;
      }
    }

    const eventIds = Array.from(new Set(regs.map((r) => r.event_id).filter(Boolean)));

    // Team memberships
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams!inner(id, event_id)")
      .eq("user_id", userId);

    const teamRows = memberships || [];
    const teamEventIds = teamRows
      .map((m: any) => m.teams?.event_id)
      .filter(Boolean);

    // Prefer an event where user is both registered and on a team
    let primaryEventId: string | null = null;
    for (const eid of eventIds) {
      if (teamEventIds.includes(eid)) {
        primaryEventId = eid;
        break;
      }
    }
    if (!primaryEventId && eventIds[0]) primaryEventId = eventIds[0];
    if (!primaryEventId && teamEventIds[0]) primaryEventId = teamEventIds[0];

    const registered = eventIds.length > 0;
    const inTeam = teamRows.length > 0;
    // Professional gate: registered AND on a team for at least one overlapping event
    // (fallback: registered + any team if event_id linkage incomplete)
    const overlap = eventIds.some((eid) => teamEventIds.includes(eid));
    const canSubmit = registered && inTeam && (overlap || teamEventIds.length > 0);

    return NextResponse.json({
      registered,
      inTeam,
      registrationCount: eventIds.length,
      teamCount: teamRows.length,
      primaryEventId,
      canSubmit,
      eventIds,
      teamEventIds,
    });
  } catch (err) {
    console.error("[eligibility]", err);
    return NextResponse.json({
      registered: false,
      inTeam: false,
      registrationCount: 0,
      teamCount: 0,
      primaryEventId: null,
      canSubmit: false,
    });
  }
}