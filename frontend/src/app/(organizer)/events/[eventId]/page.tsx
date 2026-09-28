import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { jwtVerify } from "jose";
import {
  Clock,
  Users,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Zap,
  Trophy,
  Play,
} from "lucide-react";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key_for_development_only"
);

export default async function EventHubPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("ihi_session")?.value;
  const roleCookie = cookieStore.get("ihi_role")?.value;

  // Derive role strictly from JWT session claim, falling back to role cookie
  let role = "participant";

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, SECRET);
      if (payload.role) {
        role = payload.role as string;
      }
    } catch {
      if (roleCookie) {
        role = roleCookie;
      }
    }
  } else if (roleCookie) {
    role = roleCookie;
  }

  // If no session exists at all, redirect to login
  if (!sessionCookie && !roleCookie) {
    redirect("/login");
  }

  const decodedEventName = eventId.replace(/-/g, " ").toUpperCase();

  return (
    <div
      className="relative min-h-screen selection:bg-[var(--organizer-gold-light)] selection:text-[var(--organizer-ink-primary)]"
      style={{
        backgroundColor: "var(--organizer-bg)",
        color: "var(--organizer-ink-primary)",
      }}
    >
      {/* ═══════════════════════════════════════
          A. Blueprint Graph-Paper Background
          ═══════════════════════════════════════ */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
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

      {/* ═══════════════════════════════════════
          B. Sticky Nav Header
          ═══════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/hackathons"
            className="flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[var(--organizer-gold-light)]"
            style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ALL EVENTS
          </Link>
          <div className="hidden border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-3 py-1 text-xs font-bold uppercase tracking-widest sm:block">
            EVENT NODE: {decodedEventName}
          </div>
        </div>

        {/* Dynamic Verified Role Badge */}
        <div className="flex items-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] text-xs font-bold uppercase tracking-widest">
          <span className="px-3 py-1 text-[var(--organizer-ink-muted)]">CLEARANCE:</span>
          <span
            className="border-l-2 border-[var(--organizer-ink-primary)] px-3 py-1 font-mono"
            style={{
              backgroundColor:
                role === "organizer"
                  ? "var(--organizer-ink-primary)"
                  : role === "judge"
                  ? "var(--organizer-gold-deep)"
                  : "var(--organizer-gold)",
              color:
                role === "organizer" || role === "judge"
                  ? "var(--organizer-surface)"
                  : "var(--organizer-ink-primary)",
            }}
          >
            {role}
          </span>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          C. Main Content Area
          ═══════════════════════════════════════ */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-20">
        <header className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1">
              {role === "organizer" ? (
                <ShieldAlert className="h-4 w-4 text-[var(--organizer-ink-primary)]" />
              ) : (
                <Zap className="h-4 w-4 text-[var(--organizer-gold-deep)]" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-primary)]">
                {role === "organizer"
                  ? "ORGANIZER CONSOLE - SECURE"
                  : "PARTICIPANT WORKSPACE - LIVE HACKING"}
              </span>
            </div>
            <h1 className="font-display text-5xl font-black uppercase tracking-tighter sm:text-7xl">
              {decodedEventName} <span className="text-[var(--organizer-gold-deep)]">HUB.</span>
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              {role === "organizer"
                ? "Manage judges, monitor live submissions, and adjust rubrics."
                : "Welcome back, Hacker. Complete team formation and submit your project before the deadline."}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="flex gap-4">
            <StatBlock label="PRIZE POOL" value="$50,000" highlight />
            <StatBlock label="BUILDERS" value="342" />
            <StatBlock label="TEAMS" value="86" />
          </div>
        </header>

        {/* Strictly render based on authenticated role */}
        {role === "organizer" ? (
          <OrganizerView eventId={eventId} />
        ) : (
          <ParticipantView eventId={eventId} />
        )}
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────
   Stat Block Component
   ──────────────────────────────────────────── */
function StatBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-4 py-3"
      style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
    >
      <span className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
        {label}
      </span>
      <span
        className={`font-display text-2xl font-black tracking-tighter ${
          highlight ? "text-[var(--organizer-gold-deep)]" : "text-[var(--organizer-ink-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────
   Participant POV Sub-component
   ──────────────────────────────────────────── */
function ParticipantView({ eventId }: { eventId: string }) {
  return (
    <div className="space-y-12">
      <div
        className="flex flex-col justify-between border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:flex-row md:items-center md:p-8"
        style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
      >
        <div className="mb-6 md:mb-0">
          <div className="mb-2 flex items-center gap-3">
            <Clock className="h-6 w-6 text-[var(--organizer-gold-deep)]" />
            <div className="flex gap-2">
              <span className="border border-[var(--organizer-ink-primary)] bg-[#D1FADF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-900">
                SUBMISSION GATE OPEN
              </span>
              <span className="pt-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                DEADLINE: 14H 32M REMAINING
              </span>
            </div>
          </div>
          <h2 className="font-display text-3xl font-black tracking-tighter">HACKING PHASE ACTIVE</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            YOUR TEAM &quot;NULL POINTERS&quot; IS REGISTERED UNDER THE AI/ML TRACK.
          </p>
        </div>
        <Link
          href={`/events/${eventId}/submit`}
          className="group flex items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-y-1 hover:bg-[var(--organizer-gold-deep)] hover:text-white"
          style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
        >
          <Play className="h-4 w-4" /> SUBMIT PROJECT <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div>
        <h3 className="mb-6 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
          <Zap className="h-4 w-4" /> HACKER WORKSPACE MODULES
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          <ModuleCard
            title="MY TEAM & ROSTER"
            desc="Manage team members, share invite keys, and assign project roles."
            btnText="MANAGE TEAM"
            linkHref={`/events/${eventId}/team`}
            icon={<Users className="h-5 w-5" />}
          />
          <ModuleCard
            title="SUBMIT PROJECT"
            desc="Attach repository, demo video link, tech stack deck, and AI briefing."
            btnText="LAUNCH SUBMISSION"
            linkHref={`/events/${eventId}/submit`}
            icon={<Play className="h-5 w-5" />}
            highlight
          />
          <ModuleCard
            title="RESULTS & LEADERBOARD"
            desc="Track score reviews, criterion breakdowns, and winner announcements."
            btnText="VIEW LEADERBOARD"
            linkHref={`/events/${eventId}/leaderboard`}
            icon={<Trophy className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Organizer POV Sub-component
   ──────────────────────────────────────────── */
function OrganizerView({ eventId }: { eventId: string }) {
  return (
    <div className="space-y-12">
      <div
        className="flex flex-col justify-between border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:flex-row md:items-center md:p-8"
        style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
      >
        <div className="mb-6 md:mb-0">
          <div className="mb-2 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-[var(--organizer-ink-primary)]" />
            <div className="flex gap-2">
              <span className="border border-[var(--organizer-ink-primary)] bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-900">
                LIVE MONITORING
              </span>
            </div>
          </div>
          <h2 className="font-display text-3xl font-black tracking-tighter">COMMAND CENTER</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            OVERSEE SUBMISSIONS, MANAGE JUDGE ASSIGNMENTS, AND BROADCAST ANNOUNCEMENTS.
          </p>
        </div>
        <Link
          href={`/events/${eventId}/settings`}
          className="group flex items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-[var(--organizer-surface)] transition-transform hover:-translate-y-1"
          style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
        >
          EVENT SETTINGS <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div>
        <h3 className="mb-6 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
          <ShieldAlert className="h-4 w-4" /> ORGANIZER MODULES
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          <ModuleCard
            title="JUDGE ROSTER"
            desc="Generate magic links, assign tracks, and monitor grading progress."
            btnText="MANAGE JUDGES"
            linkHref={`/events/${eventId}/judges`}
            icon={<Users className="h-5 w-5" />}
          />
          <ModuleCard
            title="RUBRIC BUILDER"
            desc="Configure criteria weights, automated AI bounds, and track scopes."
            btnText="EDIT RUBRICS"
            linkHref={`/events/${eventId}/rubrics`}
            icon={<Zap className="h-5 w-5" />}
          />
          <ModuleCard
            title="RESULTS GATE"
            desc="Review final calculations, approve winners, and publish leaderboard."
            btnText="REVIEW SCORES"
            linkHref={`/events/${eventId}/results`}
            icon={<Trophy className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Module Card Shared Component
   ──────────────────────────────────────────── */
function ModuleCard({
  title,
  desc,
  btnText,
  linkHref,
  icon,
  highlight = false,
}: {
  title: string;
  desc: string;
  btnText: string;
  linkHref: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col justify-between border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-all hover:-translate-y-1"
      style={{
        boxShadow: highlight
          ? "6px 6px 0px 0px var(--organizer-gold)"
          : "6px 6px 0px 0px var(--organizer-ink-primary)",
      }}
    >
      <div>
        <div className="mb-4 inline-flex border-2 border-[var(--organizer-ink-primary)] p-2">
          {icon}
        </div>
        <h4 className="mb-2 font-display text-xl font-black uppercase tracking-tighter">{title}</h4>
        <p className="mb-8 font-mono text-xs uppercase leading-relaxed tracking-widest text-[var(--organizer-ink-muted)]">
          {desc}
        </p>
      </div>
      <Link
        href={linkHref}
        className={`group flex w-full items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] py-3 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${
          highlight
            ? "bg-[var(--organizer-gold)] hover:bg-[var(--organizer-gold-deep)] hover:text-white"
            : "bg-[var(--organizer-bg)] hover:bg-[var(--organizer-ink-primary)] hover:text-white"
        }`}
      >
        {btnText} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}