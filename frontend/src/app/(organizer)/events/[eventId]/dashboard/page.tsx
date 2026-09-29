"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  RefreshCw,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart3,
  Code2,
  ShieldCheck,
  ArrowUpRight,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

/* ==========================================================================
   ANIMATION VARIANTS (unchanged)
   ========================================================================== */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const floatVariants: Variants = {
  animate: {
    y: [0, -15, 0],
    rotate: [0, 5, -5, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

const floatVariantsReverse: Variants = {
  animate: {
    y: [0, 15, 0],
    rotate: [0, -5, 5, 0],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ==========================================================================
   TYPES — matches your /api/dashboard/[eventId] response
   ========================================================================== */

interface DashboardPayload {
  event: {
    id: string;
    name: string;
    maxParticipants: number | null;
    submissionDeadline: string | null;
  };
  registration: {
    total: number;
    capacity: number | null;
    utilizationPercent: number | null;
  };
  teams: {
    totalTeams: number;
    soloLookingCount: number;
    totalParticipantsInTeams: number;
  };
  submissions: {
    draftCount: number;
    finalCount: number;
    totalTeams: number;
    completionPercent: number;
  };
  serverTime: string;
}

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

const EMPTY_DATA: DashboardPayload = {
  event: {
    id: "",
    name: "Event Console",
    maxParticipants: null,
    submissionDeadline: null,
  },
  registration: { total: 0, capacity: null, utilizationPercent: null },
  teams: { totalTeams: 0, soloLookingCount: 0, totalParticipantsInTeams: 0 },
  submissions: {
    draftCount: 0,
    finalCount: 0,
    totalTeams: 0,
    completionPercent: 0,
  },
  serverTime: new Date().toISOString(),
};

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function OrganizerDashboardPage() {
  const routeParams = useParams();
  const rawEventId = (routeParams?.eventId as string) || "";

  const [data, setData] = useState<DashboardPayload>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<string>("—");

  const eventTitle =
    data.event.name ||
    rawEventId.replace(/-/g, " ").toUpperCase() ||
    "EVENT";

  /* ---------- LOAD REAL DATA ---------- */
  const load = useCallback(async () => {
    if (!rawEventId) {
      setLoading(false);
      return;
    }

    // UUID guard — never hit Postgres with "1"
    if (!isValidUUID(rawEventId)) {
      setError(null);
      setData(EMPTY_DATA);
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/dashboard/${encodeURIComponent(rawEventId)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Dashboard API ${res.status}`);
      }

      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [rawEventId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- COUNTDOWN from real submission_deadline ---------- */
  useEffect(() => {
    const deadline = data.event.submissionDeadline;
    if (!deadline) {
      setCountdown("NO DEADLINE");
      return;
    }

    const tick = () => {
      const end = new Date(deadline).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown("CLOSED");
        return;
      }

      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.event.submissionDeadline]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    load();
  };

  /* ---------- DERIVED REAL METRICS ---------- */
  const regTotal = data.registration.total;
  const capacity = data.registration.capacity;
  const utilization =
    data.registration.utilizationPercent ??
    (capacity && capacity > 0 ? Math.round((regTotal / capacity) * 1000) / 10 : null);
  const slotsLeft =
    capacity != null ? Math.max(capacity - regTotal, 0) : null;

  const teamTotal = data.teams.totalTeams;
  const soloPool = data.teams.soloLookingCount;
  const inTeams = data.teams.totalParticipantsInTeams;
  const avgTeamSize =
    teamTotal > 0 ? Math.round((inTeams / teamTotal) * 10) / 10 : 0;

  const drafts = data.submissions.draftCount;
  const finals = data.submissions.finalCount;
  const subCompletion = data.submissions.completionPercent;
  const subExpected = data.submissions.totalTeams || teamTotal;

  // Registration health badge
  const regHealth =
    utilization == null
      ? { label: "NO CAP", tone: "neutral" as const }
      : utilization >= 90
      ? { label: "FULL", tone: "warn" as const }
      : utilization >= 50
      ? { label: "GOOD", tone: "good" as const }
      : { label: "EARLY", tone: "neutral" as const };

  // Team formation badge
  const teamHealth =
    teamTotal === 0
      ? { label: "NONE", tone: "neutral" as const }
      : soloPool > 10
      ? { label: "ATTENTION", tone: "warn" as const }
      : { label: "STABLE", tone: "good" as const };

  // Submissions badge
  const subHealth =
    finals === 0 && drafts === 0
      ? { label: "WAITING", tone: "neutral" as const }
      : subCompletion >= 100
      ? { label: "COMPLETE", tone: "good" as const }
      : { label: "IN PROGRESS", tone: "warn" as const };

  // Publish readiness gates (real)
  const gate1 = regTotal > 0;
  const gate2 = finals > 0 || countdown === "CLOSED";
  const gate3 = false; // judging — wire later when scores exist
  const gate4 = false; // results publish — wire later
  const gatesPassed = [gate1, gate2, gate3, gate4].filter(Boolean).length;
  const publishBlocked = gatesPassed < 4;

  const badgeClass = (tone: "good" | "warn" | "neutral" | "bad") => {
    if (tone === "good")
      return "border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 text-emerald-900";
    if (tone === "warn")
      return "border-2 border-[var(--organizer-ink-primary)] bg-amber-100 text-amber-900";
    if (tone === "bad")
      return "border-2 border-[var(--organizer-ink-primary)] bg-red-100 text-red-900";
    return "border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] text-[var(--organizer-ink-primary)]";
  };

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24 overflow-hidden p-6">
      {/* Blueprint Graph-Paper Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--organizer-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 95%)",
        }}
      />

      {/* Floating Motion Shapes */}
      <motion.div
        variants={floatVariants}
        animate="animate"
        className="pointer-events-none absolute top-12 right-12 z-0 hidden lg:block h-16 w-16 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)]"
        style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
      />
      <motion.div
        variants={floatVariantsReverse}
        animate="animate"
        className="pointer-events-none absolute bottom-24 right-24 z-0 hidden lg:block h-14 w-14 rounded-full border-2 border-[var(--organizer-ink-primary)] bg-white p-2"
      >
        <div className="h-full w-full rounded-full bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      {/* Main Shell */}
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Top Eyebrow & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest">
              ORGANIZER CONSOLE · {rawEventId.slice(0, 8).toUpperCase() || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-900">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />{" "}
              {loading ? "SYNCING" : "Live Operations"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/events/${rawEventId}/results`}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <Award className="h-3.5 w-3.5" /> Results
            </Link>
            <Link
              href={`/events/${rawEventId}/judging/rubric`}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Rubric
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-60"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh Data
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tighter uppercase">
            {eventTitle}{" "}
            <span className="text-[var(--organizer-gold-deep)]">DASHBOARD.</span>
          </h1>
          <p className="mt-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-muted)] max-w-3xl">
            Registration, team velocity, submission telemetry, judging progress,
            and publish readiness — live from Supabase.
          </p>
        </div>

        {/* Status banner — REAL, not demo */}
        <div
          className="mb-8 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
        >
          <div className="flex items-center gap-3">
            {error ? (
              <AlertTriangle className="h-4 w-4 text-red-700 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[var(--organizer-gold-deep)] flex-shrink-0" />
            )}
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-primary)]">
              {error
                ? `Dashboard error — ${error}`
                : !isValidUUID(rawEventId)
                ? "Invalid event ID in URL — showing empty metrics. Use a real event UUID."
                : loading
                ? "Connecting to live metrics…"
                : `Live metrics · ${data.event.name || rawEventId} · updated ${new Date(
                    data.serverTime
                  ).toLocaleTimeString()}`}
            </span>
          </div>
          <span className="inline-flex border border-[var(--organizer-ink-primary)] bg-white px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-primary)] w-fit">
            {error ? "ERROR" : loading ? "LOADING" : "PRODUCTION DATA"}
          </span>
        </div>

        {/* Main Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Registration Health */}
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  REGISTRATION HEALTH
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold font-mono uppercase ${badgeClass(
                    regHealth.tone
                  )}`}
                >
                  {regHealth.tone === "good" && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                  )}
                  {regHealth.tone === "warn" && (
                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                  )}
                  {regHealth.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono tracking-tight">
                    {loading ? "—" : regTotal}
                  </span>
                  <span className="text-sm font-bold font-mono text-[var(--organizer-ink-muted)]">
                    {capacity != null ? `/ ${capacity}` : "TOTAL"}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold uppercase text-[var(--organizer-gold-deep)]">
                  {utilization != null
                    ? `${utilization}% capacity reached`
                    : "No capacity limit set"}
                </p>
              </div>

              <div className="mt-4 h-3 w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-0.5">
                <div
                  className="h-full bg-[var(--organizer-gold)] transition-all duration-700"
                  style={{
                    width: `${Math.min(utilization ?? 0, 100)}%`,
                  }}
                />
              </div>

              <div className="mt-4 pt-3 border-t-2 border-[var(--organizer-border-light)] flex justify-between items-center text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                <span>
                  {slotsLeft != null
                    ? `${slotsLeft} Slots Remaining`
                    : `${regTotal} Registered`}
                </span>
                <Link
                  href={`/events/${rawEventId}/registrations`}
                  className="hover:text-[var(--organizer-ink-primary)] flex items-center gap-0.5"
                >
                  View Roster <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>

            {/* 2. Team Formation */}
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  TEAM FORMATION
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold font-mono uppercase ${badgeClass(
                    teamHealth.tone
                  )}`}
                >
                  {teamHealth.tone === "warn" && (
                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                  )}
                  {teamHealth.tone === "good" && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                  )}
                  {teamHealth.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono tracking-tight">
                    {loading ? "—" : teamTotal}
                  </span>
                  <span className="text-sm font-bold font-mono text-[var(--organizer-ink-muted)]">
                    TEAMS
                  </span>
                </div>
                <p className="text-xs font-mono font-bold uppercase text-[var(--organizer-ink-secondary)]">
                  {inTeams} participants matched in teams
                </p>
              </div>

              <div className="mt-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />{" "}
                  Unmatched Pool
                </span>
                <span className="text-xs font-black font-mono text-[var(--organizer-gold-deep)]">
                  {soloPool} Hackers
                </span>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-[var(--organizer-border-light)] flex justify-between items-center text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                <span>Avg. Size: {avgTeamSize} Hackers</span>
                <Link
                  href={`/events/${rawEventId}/teams`}
                  className="hover:text-[var(--organizer-ink-primary)] flex items-center gap-0.5"
                >
                  Manage Teams <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>

            {/* 3. Submissions Telemetry */}
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  SUBMISSIONS TELEMETRY
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold font-mono uppercase ${badgeClass(
                    subHealth.tone
                  )}`}
                >
                  {subHealth.tone === "warn" && (
                    <Clock className="h-3 w-3 text-amber-700" />
                  )}
                  {subHealth.tone === "good" && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                  )}
                  {subHealth.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono tracking-tight">
                    {loading ? "—" : finals}
                  </span>
                  <span className="text-sm font-bold font-mono text-[var(--organizer-ink-muted)]">
                    / {subExpected || "—"} FINALIZED
                  </span>
                </div>
                <p className="text-xs font-mono font-bold uppercase text-emerald-700">
                  {subCompletion}% completion rate
                </p>
              </div>

              <div className="mt-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)] flex items-center gap-1.5">
                  <Clock
                    className={`h-3.5 w-3.5 text-red-600 ${
                      countdown !== "CLOSED" && countdown !== "NO DEADLINE"
                        ? "animate-spin"
                        : ""
                    }`}
                  />{" "}
                  Countdown
                </span>
                <span className="text-xs font-black font-mono text-red-600 tracking-wider">
                  {countdown}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-[var(--organizer-border-light)] flex justify-between items-center text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                <span>{drafts} Drafts In Progress</span>
                <Link
                  href={`/events/${rawEventId}/submissions`}
                  className="hover:text-[var(--organizer-ink-primary)] flex items-center gap-0.5"
                >
                  View Submissions <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Bottom: Judging + Publish Gate */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Judging Progress */}
            <motion.div
              variants={cardVariants}
              className="md:col-span-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between border-b-2 border-[var(--organizer-border-light)] pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                    EVALUATION PIPELINE
                  </span>
                  <h3 className="text-xl font-black font-display uppercase tracking-tight mt-0.5">
                    Judging Progress
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest">
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center mb-6">
                <div>
                  <span className="text-5xl font-black font-mono tracking-tight text-[var(--organizer-gold-deep)]">
                    0%
                  </span>
                  <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-muted)] mt-1">
                    Evaluations Completed
                  </p>
                </div>

                <div className="space-y-2 border-l-2 border-[var(--organizer-border-light)] pl-4">
                  <div className="flex justify-between text-xs font-mono font-bold uppercase">
                    <span className="text-[var(--organizer-ink-muted)]">
                      Final Submissions:
                    </span>
                    <span>{finals}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono font-bold uppercase">
                    <span className="text-[var(--organizer-ink-muted)]">
                      Drafts:
                    </span>
                    <span>{drafts}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono font-bold uppercase">
                    <span className="text-[var(--organizer-ink-muted)]">
                      Teams:
                    </span>
                    <span>{teamTotal}</span>
                  </div>
                </div>
              </div>

              <p className="mb-4 text-[10px] font-mono text-[var(--organizer-ink-muted)] uppercase tracking-wider">
                Judging % will populate when scores are recorded. Assign judges
                to start the pipeline.
              </p>

              <Link
                href={`/events/${rawEventId}/judging`}
                className="w-full inline-flex items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-2.5 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{
                  boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
                }}
              >
                <Code2 className="h-4 w-4" /> Manage Judge Assignments
              </Link>
            </motion.div>

            {/* Publish Readiness Gate */}
            <motion.div
              variants={cardVariants}
              className="md:col-span-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between border-b-2 border-[var(--organizer-border-light)] pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                    SECURITY & INTEGRITY GATE
                  </span>
                  <h3 className="text-xl font-black font-display uppercase tracking-tight mt-0.5">
                    Publish Readiness
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider ${
                    publishBlocked
                      ? "border-2 border-[var(--organizer-ink-primary)] bg-red-100 text-red-900"
                      : "border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {publishBlocked ? (
                    <>
                      <Lock className="h-3 w-3 text-red-700" /> BLOCKED
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3 text-emerald-700" /> READY
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div
                  className={`flex items-center gap-2 text-xs font-mono font-bold uppercase ${
                    gate1 ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {gate1 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                  )}
                  <span>
                    {gatesPassed} / 4 Gates Passed —{" "}
                    {gate1
                      ? "Registration threshold met"
                      : "Awaiting first registrations"}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 text-xs font-mono font-bold uppercase ${
                    gate2 ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {gate2 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                  )}
                  <span>
                    Gate 2 —{" "}
                    {gate2
                      ? "Submissions received or window closed"
                      : "Submissions pending window close"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                  <span>
                    Gate 3 — Judging progress incomplete (wire scores next)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                  <span>
                    Gate 4 — Leaderboard verification awaiting publish
                  </span>
                </div>
              </div>

              <Link
                href={`/events/${rawEventId}/results`}
                className="w-full inline-flex items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] py-2.5 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{
                  boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
                }}
              >
                <Sparkles className="h-4 w-4" /> Go to Publish Gate
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}