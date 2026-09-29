"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileCode,
  Sparkles,
  Terminal,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type GateStatus = {
  loading: boolean;
  name: string;
  registered: boolean;
  inTeam: boolean;
  registrationCount: number;
  teamCount: number;
  primaryEventId: string | null;
};

const INITIAL: GateStatus = {
  loading: true,
  name: "Hacker",
  registered: false,
  inTeam: false,
  registrationCount: 0,
  teamCount: 0,
  primaryEventId: null,
};

export default function ParticipantDashboardPage() {
  const [gate, setGate] = useState<GateStatus>(INITIAL);

  useEffect(() => {
    let mounted = true;

    async function loadGates() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          if (mounted) setGate((g) => ({ ...g, loading: false }));
          return;
        }
        const meData = await meRes.json();
        const user = meData.user;
        if (!user?.id && !user?.sub) {
          if (mounted) setGate((g) => ({ ...g, loading: false }));
          return;
        }

        const userId = user.id || user.sub;
        const name = user.full_name || user.name || "Hacker";

        // Live eligibility from server (registrations + team membership)
        const eligRes = await fetch(
          `/api/participant/eligibility?userId=${encodeURIComponent(userId)}`,
          { cache: "no-store" }
        );

        let registered = false;
        let inTeam = false;
        let registrationCount = 0;
        let teamCount = 0;
        let primaryEventId: string | null = null;

        if (eligRes.ok) {
          const elig = await eligRes.json();
          registered = !!elig.registered;
          inTeam = !!elig.inTeam;
          registrationCount = elig.registrationCount || 0;
          teamCount = elig.teamCount || 0;
          primaryEventId = elig.primaryEventId || null;
        }

        if (mounted) {
          setGate({
            loading: false,
            name,
            registered,
            inTeam,
            registrationCount,
            teamCount,
            primaryEventId,
          });
        }
      } catch (err) {
        console.error("[builder-hub] gate load failed:", err);
        if (mounted) setGate((g) => ({ ...g, loading: false }));
      }
    }

    loadGates();
    return () => {
      mounted = false;
    };
  }, []);

  const canManageTeam = gate.registered;
  const canSubmit = gate.registered && gate.inTeam;

  const teamHref = gate.primaryEventId
    ? `/events/${gate.primaryEventId}/team`
    : "/team";
  const submitHref = gate.primaryEventId
    ? `/events/${gate.primaryEventId}/submit`
    : "/submit";

  return (
    <div className="min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] font-body pb-24">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `linear-gradient(to right, var(--organizer-border) 1px, transparent 1px), linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
            PARTICIPANT WORKSPACE
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tighter uppercase leading-none">
            BUILDER <span className="text-[var(--organizer-gold-deep)]">HUB.</span>
          </h1>
          <p className="font-mono text-xs font-bold text-[var(--organizer-ink-muted)] uppercase mt-2">
            Welcome back, {gate.name}. Complete the builder path: Register → Team → Submit.
          </p>
        </div>

        {/* PROGRESS STRIP */}
        <div
          className="mb-10 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4"
          style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
        >
          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
            Builder Path Status
          </div>
          {gate.loading ? (
            <p className="font-mono text-xs uppercase animate-pulse">Checking eligibility…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <StatusChip
                done={true}
                label="1. Account"
                detail="Signed in"
              />
              <StatusChip
                done={gate.registered}
                label="2. Event Registration"
                detail={
                  gate.registered
                    ? `${gate.registrationCount} event(s)`
                    : "Not registered"
                }
              />
              <StatusChip
                done={gate.inTeam}
                label="3. Team"
                detail={
                  gate.inTeam ? `${gate.teamCount} team(s)` : "No team yet"
                }
              />
              <StatusChip
                done={canSubmit}
                label="4. Submit Unlocked"
                detail={canSubmit ? "Ready" : "Locked"}
              />
            </div>
          )}
        </div>

        {/* MODULES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Arena — always open */}
          <ModuleCard
            icon={<Terminal className="w-5 h-5 text-[var(--organizer-ink-primary)]" />}
            title="HACKATHON ARENA"
            body="Explore active hackathons, view timelines, track prize pools, and register."
            shadow="var(--organizer-ink-primary)"
            cta={
              <Link
                href="/hackathons"
                className="w-full py-3 bg-[var(--organizer-ink-primary)] text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)] transition-colors"
                style={{ boxShadow: "3px 3px 0px 0px var(--organizer-gold)" }}
              >
                EXPLORE ARENA →
              </Link>
            }
          />

          {/* Team — needs registration */}
          <ModuleCard
            icon={<Users className="w-5 h-5 text-[var(--organizer-gold-deep)]" />}
            title="TEAM & ROSTER"
            body="Form or join a team, manage invite links, and assign builder roles."
            shadow="var(--organizer-gold)"
            cta={
              canManageTeam ? (
                <Link
                  href={teamHref}
                  className="w-full py-3 bg-[var(--organizer-gold)] border-2 border-[var(--organizer-ink-primary)] text-[var(--organizer-ink-primary)] font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold-deep)] hover:text-white transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                >
                  MANAGE TEAM →
                </Link>
              ) : (
                <LockedCta
                  reason="Register for a hackathon first"
                  href="/hackathons"
                  actionLabel="REGISTER FOR EVENT →"
                />
              )
            }
          />

          {/* Submit — needs registration + team */}
          <ModuleCard
            icon={<FileCode className="w-5 h-5 text-[var(--organizer-ink-primary)]" />}
            title="PROJECT SUBMISSIONS"
            body="Submit repository links, demo videos, tech stacks, and AI briefings."
            shadow="var(--organizer-ink-primary)"
            cta={
              canSubmit ? (
                <Link
                  href={submitHref}
                  className="w-full py-3 bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] text-[var(--organizer-ink-primary)] font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold)] transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                >
                  SUBMIT PROJECT →
                </Link>
              ) : (
                <LockedCta
                  reason={
                    !gate.registered
                      ? "Register for an event first"
                      : "Join or create a team first"
                  }
                  href={!gate.registered ? "/hackathons" : teamHref}
                  actionLabel={
                    !gate.registered ? "REGISTER FOR EVENT →" : "GO TO TEAM →"
                  }
                />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatusChip({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 border-2 px-3 py-2 ${
        done
          ? "border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)]"
          : "border-[var(--organizer-border)] bg-[var(--organizer-bg)]"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
      ) : (
        <Lock className="h-3.5 w-3.5 text-[var(--organizer-ink-muted)]" />
      )}
      <div>
        <div className="font-mono text-[9px] font-black uppercase tracking-widest">
          {label}
        </div>
        <div className="font-mono text-[9px] uppercase text-[var(--organizer-ink-muted)]">
          {detail}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  body,
  shadow,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  shadow: string;
  cta: React.ReactNode;
}) {
  return (
    <div
      className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 flex flex-col justify-between"
      style={{ boxShadow: `6px 6px 0px 0px ${shadow}` }}
    >
      <div>
        <div className="w-10 h-10 bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-xs font-mono text-[var(--organizer-ink-muted)] leading-relaxed mb-6 uppercase">
          {body}
        </p>
      </div>
      {cta}
    </div>
  );
}

function LockedCta({
  reason,
  href,
  actionLabel,
}: {
  reason: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 border-2 border-dashed border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-3">
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)] shrink-0 mt-0.5" />
        <p className="font-mono text-[9px] font-bold uppercase text-[var(--organizer-ink-muted)]">
          Locked — {reason}
        </p>
      </div>
      <Link
        href={href}
        className="w-full py-3 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold-light)] transition-colors"
        style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
      >
        <Lock className="h-3.5 w-3.5" />
        {actionLabel}
      </Link>
    </div>
  );
}