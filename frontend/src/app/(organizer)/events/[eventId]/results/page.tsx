"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  RefreshCw,
  FileText,
  Lock,
  AlertCircle,
  Award,
  BarChart3,
  ArrowLeft,
  Unlock,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import Link from "next/link";

/* ==========================================================================
   ANIMATION (preserved)
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
   TYPES — matches ApiResult<ResultsSummary> from your route
   ========================================================================== */

interface RankingRow {
  submission_id: string;
  project_title: string;
  team_name: string;
  score_count: number;
  final_average_score: number;
  rank: number;
}

interface ResultsSummary {
  event_id: string;
  event_name: string;
  event_status: string;
  total_submissions: number;
  total_scored_submissions: number;
  completion_percentage: number;
  is_publishable: boolean;
  rankings: RankingRow[];
}

interface ApiOk<T> {
  ok: true;
  data: T;
}

interface ApiErr {
  ok: false;
  error: string;
  code?: string;
}

type ApiResult<T> = ApiOk<T> | ApiErr;

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function EventResultsPage() {
  const routeParams = useParams();
  const eventId = (routeParams?.eventId as string) || "";

  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setError("Missing event id.");
      return;
    }

    // Soft-guard bad URLs like /events/1 — still call API (it resolves UUID or slug)
    // but avoid pointless thrash when empty
    try {
      setError(null);
      setAuthRequired(false);
      setPublishMessage(null);

      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/results`,
        { cache: "no-store" }
      );

      const json = (await res.json()) as ApiResult<ResultsSummary>;

      if (res.status === 401 || (!json.ok && json.code === "unauthorized")) {
        setAuthRequired(true);
        setSummary(null);
        setError("Authentication required.");
        return;
      }

      if (!res.ok || !json.ok) {
        setSummary(null);
        setError(!json.ok ? json.error : `Failed to load results (${res.status})`);
        return;
      }

      setSummary(json.data);
    } catch (err) {
      console.error("Results load error:", err);
      setError("Network error loading results.");
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePublish = async () => {
    if (!summary?.is_publishable || publishing) return;

    const confirmed = window.confirm(
      "Publish results publicly? This sets event status to results_published and writes an audit log. Continue?"
    );
    if (!confirmed) return;

    setPublishing(true);
    setPublishMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/results`,
        { method: "POST" }
      );
      const json = (await res.json()) as ApiResult<unknown>;

      if (!res.ok || !json.ok) {
        setError(!json.ok ? json.error : "Publish failed.");
        return;
      }

      setPublishMessage("Results published. Event status → results_published.");
      await load();
    } catch (err) {
      console.error(err);
      setError("Network error while publishing.");
    } finally {
      setPublishing(false);
    }
  };

  const completion = summary?.completion_percentage ?? 0;
  const total = summary?.total_submissions ?? 0;
  const scored = summary?.total_scored_submissions ?? 0;
  const isPublishable = summary?.is_publishable ?? false;
  const isPublished = summary?.event_status === "results_published";
  const rankings = summary?.rankings ?? [];
  const eventName = summary?.event_name || "EVENT";

  const medal = (rank: number) => {
    if (rank === 1) return "bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)]";
    if (rank === 2) return "bg-gray-200 text-[var(--organizer-ink-primary)]";
    if (rank === 3) return "bg-amber-700/20 text-amber-900";
    return "bg-[var(--organizer-bg)] text-[var(--organizer-ink-muted)]";
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
        className="pointer-events-none absolute bottom-24 right-24 z-0 hidden lg:block h-12 w-12 rounded-full border-2 border-[var(--organizer-ink-primary)] bg-white p-2"
      >
        <div className="h-full w-full rounded-full bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}/dashboard`}
              className="inline-flex items-center gap-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{
                boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </Link>
            <span className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest">
              EVENTS / RESULTS
              {eventId ? ` · ${eventId.slice(0, 8)}…` : ""}
            </span>
            {isPublished && (
              <span className="inline-flex items-center gap-1.5 border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-900">
                <CheckCircle2 className="h-3 w-3" /> Published
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/events/${eventId}/audit-log`}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <FileText className="h-3.5 w-3.5" /> Audit log
            </Link>
            <Link
              href={`/events/${eventId}/judging/rubric`}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Rubric
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-60"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tighter uppercase">
            {loading ? "EVENT" : eventName}{" "}
            <span className="text-[var(--organizer-gold-deep)]">RESULTS.</span>
          </h1>
          <p className="mt-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-muted)] max-w-3xl">
            Rankings computed server-side from immutable scores (rubric weights).
            Review before publishing. Client never invents ranks.
          </p>
        </div>

        {/* Invalid UUID hint (non-blocking — API also accepts slug) */}
        {eventId && !isValidUUID(eventId) && (
          <div
            className="mb-6 border-2 border-[var(--organizer-ink-primary)] bg-amber-50 p-4 flex items-start gap-3"
            style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
          >
            <AlertCircle className="h-5 w-5 text-amber-700 flex-shrink-0" />
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
              URL id is not a UUID. API will try slug match. Prefer{" "}
              <span className="underline">events.id</span> from Supabase for
              reliability.
            </p>
          </div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Auth / error banners */}
          {authRequired && (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-amber-50 p-4 flex items-center gap-3"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <AlertCircle className="h-5 w-5 text-amber-700 flex-shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
                Authentication required. Sign in as organizer and refresh.
              </span>
            </motion.div>
          )}

          {error && !authRequired && (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-red-50 p-4 flex items-center gap-3"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-900">
                {error}
              </span>
            </motion.div>
          )}

          {publishMessage && (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-emerald-50 p-4 flex items-center gap-3"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900">
                {publishMessage}
              </span>
            </motion.div>
          )}

          {/* Scoring completion */}
          <motion.div
            variants={cardVariants}
            className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:p-8"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Gauge */}
              <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--organizer-border-light)] pb-6 md:pb-0 md:pr-6">
                <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-[var(--organizer-border)] bg-[var(--organizer-bg)]">
                  {/* simple arc fill via conic-gradient */}
                  <div
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: `conic-gradient(var(--organizer-gold) ${Math.min(
                        completion,
                        100
                      )}%, transparent 0)`,
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
                    }}
                  />
                  <div className="relative text-center z-10">
                    <span className="block text-3xl font-black font-mono">
                      {loading ? "—" : `${completion}%`}
                    </span>
                    <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      COMPLETE
                    </span>
                  </div>
                </div>
              </div>

              {/* Gates */}
              <div className="md:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black font-display uppercase tracking-tight">
                      Scoring Completion
                    </h3>
                    <p className="text-xs font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                      {loading
                        ? "Loading…"
                        : `${scored} / ${total} submissions with ≥1 score`}
                    </p>
                  </div>

                  {isPublished ? (
                    <span className="inline-flex items-center gap-1.5 border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-900">
                      <Unlock className="h-3 w-3" /> Published
                    </span>
                  ) : isPublishable ? (
                    <span className="inline-flex items-center gap-1.5 border-2 border-[var(--organizer-ink-primary)] bg-emerald-100 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-900">
                      <Unlock className="h-3 w-3" /> Ready To Publish
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 border-2 border-[var(--organizer-ink-primary)] bg-amber-100 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-amber-900">
                      <Lock className="h-3 w-3" /> Blocked — Incomplete Scoring
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-[var(--organizer-ink-secondary)] leading-relaxed">
                  Publish is structurally disabled until completion reaches 100%
                  (every submission has at least one judge score). The server
                  re-checks this gate on publish — the button alone is not the
                  security boundary.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={handlePublish}
                    disabled={
                      !isPublishable ||
                      isPublished ||
                      publishing ||
                      loading ||
                      authRequired
                    }
                    className={`inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] px-6 py-3 text-xs font-bold font-mono uppercase tracking-wider ${
                      isPublishable && !isPublished && !authRequired
                        ? "bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1 cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                    }`}
                    style={{
                      boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
                    }}
                  >
                    <Award className="h-4 w-4" />
                    {publishing
                      ? "Publishing…"
                      : isPublished
                      ? "Already Published"
                      : "Publish Results"}
                  </button>

                  <Link
                    href={`/events/${eventId}/judging`}
                    className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-6 py-3 text-xs font-bold font-mono uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
                    style={{
                      boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
                    }}
                  >
                    <Trophy className="h-4 w-4" /> Open Judging
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Leaderboard */}
          {loading ? (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-12 text-center"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="mx-auto h-8 w-8 border-2 border-[var(--organizer-border)] border-t-[var(--organizer-gold)] rounded-full animate-spin mb-4" />
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-muted)]">
                Aggregating scores server-side…
              </p>
            </motion.div>
          ) : rankings.length === 0 ? (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-12 text-center"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] mb-4">
                <Award className="h-8 w-8 text-[var(--organizer-gold-deep)]" />
              </div>
              <h3 className="text-lg font-black font-display uppercase tracking-tight mb-1">
                No Submissions To Rank Yet
              </h3>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-muted)] max-w-md mx-auto">
                Once teams submit projects and judges score them, the live
                calculated leaderboard will render here from{" "}
                <span className="text-[var(--organizer-ink-primary)]">
                  scores + submissions
                </span>
                .
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={cardVariants}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] overflow-hidden"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="px-6 py-4 border-b-2 border-[var(--organizer-border-light)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black font-display uppercase tracking-tight">
                    Live Leaderboard
                  </h3>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                    {rankings.length} project
                    {rankings.length === 1 ? "" : "s"} · competition ranking
                    (ties share rank)
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-2 py-1">
                  Server Aggregated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--organizer-border-light)] bg-[var(--organizer-bg)]">
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                        Rank
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                        Project / Team
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                        Judges
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] text-right">
                        Avg Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row, idx) => (
                      <tr
                        key={row.submission_id}
                        className="border-b border-[var(--organizer-border-light)] hover:bg-[var(--organizer-bg)]/80 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--organizer-ink-primary)] text-xs font-black font-mono ${medal(
                              row.rank
                            )}`}
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-display font-black text-sm uppercase tracking-tight">
                            {row.project_title}
                          </p>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--organizer-ink-muted)] mt-0.5">
                            {row.team_name}
                          </p>
                          <p className="text-[9px] font-mono text-[var(--organizer-ink-muted)] mt-1">
                            {row.submission_id.slice(0, 8)}…
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-mono font-bold">
                            {row.score_count}
                            <span className="text-[var(--organizer-ink-muted)] font-normal">
                              {" "}
                              score{row.score_count === 1 ? "" : "s"}
                            </span>
                          </span>
                          {row.score_count === 0 && (
                            <span className="ml-2 inline-flex border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-amber-900">
                              Unscored
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-lg font-black font-mono tabular-nums">
                            {row.score_count === 0
                              ? "—"
                              : row.final_average_score.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}