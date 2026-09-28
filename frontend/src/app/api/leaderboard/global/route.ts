import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  handle: string;
  avatar: string;
  points: number;
  wins: number;
  streak: number;
  tier: string;
  badgeCount: number;
  isCurrentUser?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Resolve active user session safely
    let currentUserId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("ihi_session")?.value;
      if (token) {
        const session = await verifySession(token);
        currentUserId = (session as { sub?: string })?.sub ?? null;
      }
    } catch {
      // Optional session verification
    }

    // 2. Fetch global data from Supabase tables
    const [usersRes, membersRes, teamsRes, scoresRes, submissionsRes] = await Promise.all([
      supabase.from("users").select("id, full_name, email, avatar_url, github_username"),
      supabase.from("team_members").select("user_id, team_id"),
      supabase.from("teams").select("id, event_id"),
      supabase.from("scores").select("team_id, total_score"),
      supabase.from("submissions").select("team_id, created_at"),
    ]);

    const users: Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      github_username: string | null;
    }> = usersRes.data ?? [];

    const members: Array<{ user_id: string; team_id: string }> = membersRes.data ?? [];
    const teams: Array<{ id: string; event_id: string }> = teamsRes.data ?? [];
    const scores: Array<{ team_id: string; total_score: number | null }> = scoresRes.data ?? [];
    const submissions: Array<{ team_id: string; created_at: string }> = submissionsRes.data ?? [];

    // 3. Map teams to event IDs to determine event rankings
    const teamEventMap = new Map<string, string>();
    teams.forEach((t: { id: string; event_id: string }) => {
      if (t.id && t.event_id) {
        teamEventMap.set(t.id, t.event_id);
      }
    });

    // 4. Calculate team rankings per event for Victories & Medals
    const scoresByEvent = new Map<string, { teamId: string; score: number }[]>();
    scores.forEach((s: { team_id: string; total_score: number | null }) => {
      const eventId = teamEventMap.get(s.team_id);
      if (eventId && typeof s.total_score === "number") {
        const arr = scoresByEvent.get(eventId) ?? [];
        arr.push({ teamId: s.team_id, score: s.total_score });
        scoresByEvent.set(eventId, arr);
      }
    });

    const teamRanks = new Map<string, number>();
    scoresByEvent.forEach((eventScores) => {
      eventScores.sort((a, b) => b.score - a.score);
      eventScores.forEach((es, index) => {
        teamRanks.set(es.teamId, index + 1);
      });
    });

    // 5. Track submissions for Build Streak calculation
    const teamHasSubmission = new Set<string>();
    submissions.forEach((sub: { team_id: string; created_at: string }) => {
      if (sub.team_id) teamHasSubmission.add(sub.team_id);
    });

    // 6. Aggregate stats per user
    const userStats = new Map<
      string,
      { wins: number; badgeCount: number; streak: number; points: number }
    >();

    members.forEach((m: { user_id: string; team_id: string }) => {
      const stats = userStats.get(m.user_id) ?? { wins: 0, badgeCount: 0, streak: 0, points: 0 };

      const scoreObj = scores.find((s: { team_id: string }) => s.team_id === m.team_id);
      const teamScore = typeof scoreObj?.total_score === "number" ? scoreObj.total_score : 0;
      stats.points += teamScore;

      const rank = teamRanks.get(m.team_id);
      if (rank === 1) stats.wins += 1;
      if (rank && rank <= 3) stats.badgeCount += 1;

      if (teamHasSubmission.has(m.team_id)) {
        stats.streak += 1;
      }

      userStats.set(m.user_id, stats);
    });

    // Tier helper
    const getTier = (points: number, wins: number): string => {
      if (points >= 18000 || wins >= 8) return "GRANDMASTER";
      if (points >= 14000 || wins >= 5) return "MASTER";
      if (points >= 10000 || wins >= 3) return "ELITE";
      return "CONTENDER";
    };

    const defaultAvatars = [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    ];

    // 7. Format entries
    const entries: LeaderboardEntry[] = users.map(
      (
        u: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          github_username: string | null;
        },
        idx: number
      ) => {
        const stats = userStats.get(u.id) ?? { wins: 0, badgeCount: 0, streak: 0, points: 0 };
        const fullName =
          u.full_name?.toUpperCase() ?? u.email?.split("@")[0].toUpperCase() ?? "ANONYMOUS";
        const handle = u.github_username ?? u.email?.split("@")[0] ?? "operator";
        const avatar = u.avatar_url ?? defaultAvatars[idx % defaultAvatars.length];

        return {
          rank: 0,
          id: u.id,
          name: fullName,
          handle: handle.toLowerCase(),
          avatar,
          points: Math.round(stats.points),
          wins: stats.wins,
          streak: stats.streak > 0 ? stats.streak * 12 : 0,
          tier: getTier(stats.points, stats.wins),
          badgeCount: stats.badgeCount,
          isCurrentUser: u.id === currentUserId,
        };
      }
    );

    // 8. Sort by points desc
    entries.sort((a, b) => b.points - a.points || b.wins - a.wins);

    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    return NextResponse.json({ entries, currentUserId }, { status: 200 });
  } catch (err) {
    console.error("[global-leaderboard-route] error:", err);
    return NextResponse.json(
      { entries: [], currentUserId: null, error: "server_error" },
      { status: 200 }
    );
  }
}