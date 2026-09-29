"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  RefreshCw,
  Sparkles,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Gavel,
  Star,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const floatOne: Variants = {
  animate: {
    y: [0, -14, 0],
    rotate: [12, 18, 6, 12],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

const floatTwo: Variants = {
  animate: {
    y: [0, 12, 0],
    rotate: [-8, -3, -14, -8],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
  },
};

type QueueTab = "all" | "unscored" | "completed" | "corrections";

interface QueueItem {
  id: string;
  title: string;
  teamName: string;
  track: string;
  status: "pending" | "scored" | "correction";
  priority: number;
  submittedAt: string;
  repoUrl?: string | null;
}

const FALLBACK_QUEUE: QueueItem[] = [
  {
    id: "sub-001",
    title: "SIGNAL FOUNDRY",
    teamName: "NULL POINTERS",
    track: "AI/ML",
    status: "pending",
    priority: 1,
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    repoUrl: "https://github.com/example/signal-foundry",
  },
  {
    id: "sub-002",
    title: "AGENT MESH ROUTER",
    teamName: "TECHOPHILERS",
    track: "MERN",
    status: "pending",
    priority: 2,
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "sub-003",
    title: "ZK EDGE COMPILER",
    teamName: "HACKSHASTRA",
    track: "WEB3",
    status: "scored",
    priority: 3,
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "sub-004",
    title: "NEUROSCRIBE LITE",
    teamName: "VECTOR LAB",
    track: "AI/ML",
    status: "correction",
    priority: 1,
    submittedAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

function QueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId");

  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<QueueTab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  
  // Track active event ID
  const [activeEventId, setActiveEventId] = useState<string>(urlEventId || "");

  const loadQueue = useCallback(async () => {
    setAuthError(null);
    setLoading(true);
    
    try {
      // 1. Resolve the exact event ID from the URL or session cookie.
      let resolvedEventId = urlEventId;
      if (!resolvedEventId && typeof document !== "undefined") {
        const cookieEvent = document.cookie
          .split("; ")
          .find((c) => c.startsWith("ihi_event_id="))
          ?.split("=")[1];
        if (cookieEvent) resolvedEventId = decodeURIComponent(cookieEvent);
      }
      if (!resolvedEventId) {
        setAuthError("An event ID is required to load the judging queue.");
        setDemoMode(false);
        setQueue([]);
        return;
      }
      setActiveEventId(resolvedEventId);

      // 2. Fetch live data from API
      const qs = `?eventId=${encodeURIComponent(resolvedEventId)}`;
      const res = await fetch(`/api/judging/queue${qs}`, {
        cache: "no-store",
      });

      // Read body even on error
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.status === 401) {
        setAuthError("Authentication required.");
        setDemoMode(false);
        setQueue([]);
        return;
      }

      // Prefer items if present even when ok:false
      const rows = json?.items || json?.data || json?.queue || [];

      if (!res.ok && (!Array.isArray(rows) || rows.length === 0)) {
        console.error("[queue] API error", res.status, json);
        setAuthError(
          json?.error ||
            json?.warning ||
            `Queue API failed (${res.status}). Check /api/judging/queue and Supabase env.`
        );
        setDemoMode(false);
        setQueue([]);
        return;
      }

      if (Array.isArray(rows) && rows.length > 0) {
        setDemoMode(false);
        setAuthError(null);
        setQueue(
          rows.map((r: any, i: number) => ({
            id: r.id || r.submission_id || `sub-${i}`,
            title: String(r.title || r.project_title || "UNTITLED PROJECT").toUpperCase(),
            teamName: String(r.team_name || r.team || "UNKNOWN TEAM").toUpperCase(),
            track: String(r.track || "GENERAL").toUpperCase(),
            status:
              r.status === "scored" || r.is_scored
                ? "scored"
                : r.status === "correction" || r.needs_correction
                ? "correction"
                : "pending",
            priority: r.priority ?? i + 1,
            submittedAt:
              r.submitted_at || r.created_at || new Date().toISOString(),
            repoUrl: r.repo_url || null,
          }))
        );
      } else {
        setDemoMode(false);
        setAuthError(null);
        setQueue([]);
        if (json?.warning || json?.error) {
          console.warn("[queue]", json.warning || json.error);
        }
      }
      // 3. Map real data
      if (Array.isArray(rows) && rows.length > 0) {
        setDemoMode(false);
        setQueue(
          rows.map((r: any, i: number) => ({
            id: r.id || r.submission_id || `sub-${i}`,
            title: String(r.title || r.project_title || "UNTITLED PROJECT").toUpperCase(),
            teamName: String(r.team_name || r.team || "UNKNOWN TEAM").toUpperCase(),
            track: String(r.track || "GENERAL").toUpperCase(),
            status:
              r.status === "scored" || r.is_scored
                ? "scored"
                : r.status === "correction" || r.needs_correction
                ? "correction"
                : "pending",
            priority: r.priority ?? i + 1,
            submittedAt: r.submitted_at || r.created_at || new Date().toISOString(),
            repoUrl: r.repo_url || null,
          }))
        );
      } else {
        // Empty DB means Empty Queue (no fake data override)
        setDemoMode(false);
        setQueue([]);
      }
    } catch (err) {
      console.error("[Queue Load Error]:", err);
      // Only fall back to local demo queue on catastrophic failure
      const demoActive = typeof window !== "undefined" ? localStorage.getItem("ihi_demo_judge") : null;
      if (demoActive) {
        setDemoMode(true);
        setQueue(FALLBACK_QUEUE);
      } else {
        setAuthError("Failed to fetch live queue data.");
        setQueue([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [urlEventId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
  };

  const enableDemoJudge = () => {
    const demo = {
      name: "DR. PRIYA RAO",
      email: "priya@ihi.io",
      id: "judge-demo-001",
    };
    localStorage.setItem("ihi_demo_judge", JSON.stringify(demo));
    setAuthError(null);
    setDemoMode(true);
    setQueue(FALLBACK_QUEUE);
  };

  const counts = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((q) => q.status === "pending").length;
    const scored = queue.filter((q) => q.status === "scored").length;
    const corrections = queue.filter((q) => q.status === "correction").length;
    const completion = total === 0 ? 0 : Math.round((scored / total) * 100);
    return { total, pending, scored, corrections, completion };
  }, [queue]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "unscored":
        return queue.filter((q) => q.status === "pending");
      case "completed":
        return queue.filter((q) => q.status === "scored");
      case "corrections":
        return queue.filter((q) => q.status === "correction");
      default:
        return queue;
    }
  }, [queue, tab]);

  const statusBadge = (status: QueueItem["status"]) => {
    if (status === "scored")
      return {
        label: "SCORED",
        className: "bg-emerald-100 text-emerald-900 border-emerald-900",
      };
    if (status === "correction")
      return {
        label: "CORRECTION",
        className: "bg-amber-100 text-amber-950 border-amber-900",
      };
    return {
      label: "UNSCORED",
      className:
        "bg-[var(--organizer-gold-light)] text-[var(--organizer-ink-primary)] border-[var(--organizer-ink-primary)]",
    };
  };

  return (
    <>
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="mb-8 border-b-2 border-[var(--organizer-ink-primary)] pb-6">
          <div className="mb-3 inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
            Judge Portal · Priority First
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-5xl font-black font-display uppercase tracking-tighter md:text-6xl">
                Judge <span className="text-[var(--organizer-gold-deep)]">Queue.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs font-mono uppercase tracking-wide text-[var(--organizer-ink-muted)]">
                Evaluate submissions for event{" "}
                <span className="font-black text-[var(--organizer-ink-primary)]">
                  {activeEventId}
                </span>
                . Priority projects appear first.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-2.5 py-1 text-[10px] font-bold font-mono uppercase">
                <Shield className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                Scoped event:
                <span className="bg-[var(--organizer-gold)] px-1.5 py-0.5 text-[var(--organizer-ink-primary)]">
                  {activeEventId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-5 py-2.5 text-xs font-bold font-mono uppercase transition-transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-50"
              style={{
                boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
              }}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Auth / demo banner */}
        {(authError || demoMode) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--organizer-ink-primary)] bg-amber-50 p-4">
            <div className="flex items-start gap-2 text-xs font-mono font-bold text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {authError
                  ? "Authentication required. Enable demo judge session to continue scoring UI, or sign in at /login."
                  : "Demo judge mode active — queue seeded for local evaluation."}
              </span>
            </div>
            <div className="flex gap-2">
              {authError && (
                <button
                  type="button"
                  onClick={enableDemoJudge}
                  className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-4 py-2 text-[10px] font-bold font-mono uppercase text-[var(--organizer-ink-primary)]"
                  style={{
                    boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
                  }}
                >
                  <Zap className="mr-1 inline h-3.5 w-3.5" />
                  Demo Judge Sign-In
                </button>
              )}
              <Link
                href="/login"
                className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-2 text-[10px] font-bold font-mono uppercase"
                style={{
                  boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
                }}
              >
                Real Login
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "Total Assigned",
              value: String(counts.total),
              sub: "All active assignments",
              icon: ClipboardList,
            },
            {
              label: "Pending Evaluation",
              value: String(counts.pending),
              sub: "Awaiting your score",
              icon: Clock,
            },
            {
              label: "Completed Scores",
              value: String(counts.scored),
              sub: `${counts.completion}% completion`,
              icon: CheckCircle2,
            },
            {
              label: "Correction Requests",
              value: String(counts.corrections),
              sub: "Needs score revision",
              icon: AlertTriangle,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-y-1"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  {s.label}
                </div>
                <s.icon className="h-4 w-4 text-[var(--organizer-gold-deep)]" />
              </div>
              <div className="mt-2 text-3xl font-black font-display">
                {loading ? "—" : s.value}
              </div>
              <div className="text-[10px] font-mono text-[var(--organizer-ink-muted)]">
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="mb-6 flex flex-wrap gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-1"
          style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
        >
          {(
            [
              { id: "all", label: "All Projects", count: counts.total },
              { id: "unscored", label: "Unscored", count: counts.pending },
              { id: "completed", label: "Completed", count: counts.scored },
              {
                id: "corrections",
                label: "Corrections Pending",
                count: counts.corrections,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold font-mono uppercase transition-colors ${
                tab === t.id
                  ? "border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)]"
                  : "text-[var(--organizer-ink-secondary)] hover:text-[var(--organizer-ink-primary)]"
              }`}
            >
              <Filter className="h-3 w-3" />
              {t.label}
              <span
                className={`border px-1.5 py-0.5 text-[9px] ${
                  tab === t.id
                    ? "border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]"
                    : "border-[var(--organizer-border)] bg-[var(--organizer-bg)]"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Queue list */}
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-[var(--organizer-gold-deep)]" />
              <p className="text-xs font-mono uppercase text-[var(--organizer-ink-muted)]">
                Loading scoring queue…
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-12 text-center"
            style={{ boxShadow: "8px 8px 0px 0px var(--organizer-gold)" }}
          >
            <Scale className="mx-auto mb-3 h-10 w-10 text-[var(--organizer-gold-deep)]" />
            <h2 className="text-2xl font-black font-display uppercase">
              Queue Empty.
            </h2>
            <p className="mt-2 text-xs font-mono text-[var(--organizer-ink-muted)]">
              No submissions match this filter for event {activeEventId}.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filtered.map((item) => {
              const badge = statusBadge(item.status);
              return (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  className="group flex flex-wrap items-center justify-between gap-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-x-1 hover:-translate-y-1"
                  style={{
                    boxShadow: "5px 5px 0px 0px var(--organizer-gold)",
                  }}
                >
                  <div className="flex min-w-[240px] items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] font-mono text-xs font-black">
                      P{item.priority}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black font-display uppercase tracking-tight group-hover:text-[var(--organizer-gold-deep)] transition-colors">
                          {item.title}
                        </h3>
                        <span
                          className={`border-2 px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                        {item.teamName} · {item.track}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-[var(--organizer-ink-muted)]">
                        Submitted{" "}
                        {new Date(item.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "pending" && (
                      <span className="inline-flex items-center gap-1 border border-[var(--organizer-border)] bg-[var(--organizer-bg)] px-2 py-1 text-[9px] font-bold font-mono uppercase text-[var(--organizer-gold-deep)]">
                        <Star className="h-3 w-3" /> AI Briefing Ready
                      </span>
                    )}
                    <Link
                      href={`/judge/queue/${item.id}`}
                      className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-4 py-2.5 text-[10px] font-bold font-mono uppercase text-[var(--organizer-surface)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)]"
                      style={{
                        boxShadow: "3px 3px 0px 0px var(--organizer-gold)",
                      }}
                    >
                      {item.status === "scored"
                        ? "Review Score"
                        : "Open Scoring"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
}

export default function JudgeQueuePage() {
  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] pb-24 text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-[var(--organizer-ink-primary)]">
      {/* Scope-specific CSS overrides to transform parent dark navbar into Neo-Brutalist style without touching layout files */}
      <style>{`
        header, 
        nav,
        [class*="bg-black"], 
        [class*="bg-neutral-900"], 
        [class*="bg-zinc-900"],
        [class*="bg-[#0a0a0a]"],
        [class*="bg-[#0A0A0A]"] {
          background-color: var(--organizer-surface) !important;
          border-bottom: 2px solid var(--organizer-ink-primary) !important;
          color: var(--organizer-ink-primary) !important;
        }

        header *, 
        nav *,
        [class*="bg-black"] *, 
        [class*="bg-neutral-900"] *, 
        [class*="bg-zinc-900"] * {
          color: var(--organizer-ink-primary) !important;
          border-color: var(--organizer-ink-primary) !important;
        }

        header button, 
        header a, 
        [class*="bg-black"] button, 
        [class*="bg-black"] a {
          background-color: var(--organizer-surface) !important;
          color: var(--organizer-ink-primary) !important;
          border: 2px solid var(--organizer-ink-primary) !important;
          border-radius: 0px !important;
          box-shadow: 2px 2px 0px 0px var(--organizer-ink-primary) !important;
          font-weight: 800 !important;
          font-family: var(--font-mono), monospace !important;
          text-transform: uppercase !important;
        }

        header button:hover, 
        header a:hover, 
        [class*="bg-black"] button:hover, 
        [class*="bg-black"] a:hover {
          background-color: var(--organizer-gold-light) !important;
          transform: translate(-1px, -1px) !important;
        }
      `}</style>

      {/* Blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--organizer-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
        }}
      />

      {/* Floating shapes */}
      <motion.div
        variants={floatOne}
        animate="animate"
        className="pointer-events-none absolute right-12 top-16 z-10 hidden h-16 w-16 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] lg:flex"
      >
        <Gavel className="h-8 w-8 text-[var(--organizer-ink-primary)]" />
      </motion.div>
      <motion.div
        variants={floatTwo}
        animate="animate"
        className="pointer-events-none absolute left-10 top-80 z-10 hidden h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] shadow-[6px_6px_0px_0px_var(--organizer-gold)] lg:flex"
      >
        <div className="h-5 w-5 rotate-45 bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      {/* Suspense Wrapper to protect useSearchParams in Next 15 */}
      <Suspense fallback={
        <div className="relative z-10 mx-auto flex h-96 max-w-7xl items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--organizer-gold-deep)]" />
        </div>
      }>
        <QueueContent />
      </Suspense>
    </div>
  );
}