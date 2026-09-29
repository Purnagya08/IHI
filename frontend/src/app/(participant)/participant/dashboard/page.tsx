"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, FileCode, Award, ArrowRight, Sparkles, Terminal } from "lucide-react";
import { getAuthSession, type UserProfile } from "@/lib/auth";

export default function ParticipantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (session && session.name) {
      setUser(session);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] font-body pb-24">
      {/* Blueprint Grid Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `linear-gradient(to right, var(--organizer-border) 1px, transparent 1px), linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
            PARTICIPANT WORKSPACE
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tighter uppercase leading-none">
            BUILDER <span className="text-[var(--organizer-gold-deep)]">HUB.</span>
          </h1>
          <p className="font-mono text-xs font-bold text-[var(--organizer-ink-muted)] uppercase mt-2">
            Welcome back, {user?.name || "Hacker"}. Manage your teams, submit projects, and browse hackathons.
          </p>
        </div>

        {/* WORKSPACE MODULES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Module 1: Hackathons Arena */}
          <div
            className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 flex flex-col justify-between"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
          >
            <div>
              <div className="w-10 h-10 bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5 text-[var(--organizer-ink-primary)]" />
              </div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">
                HACKATHON ARENA
              </h3>
              <p className="text-xs font-mono text-[var(--organizer-ink-muted)] leading-relaxed mb-6 uppercase">
                Explore active hackathons, view timelines, track prize pools, and register.
              </p>
            </div>

            <Link
              href="/hackathons"
              className="w-full py-3 bg-[var(--organizer-ink-primary)] text-white font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)] transition-colors"
              style={{ boxShadow: "3px 3px 0px 0px var(--organizer-gold)" }}
            >
              EXPLORE ARENA →
            </Link>
          </div>

          {/* Module 2: Team Roster */}
          <div
            className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 flex flex-col justify-between"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
          >
            <div>
              <div className="w-10 h-10 bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[var(--organizer-gold-deep)]" />
              </div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">
                TEAM & ROSTER
              </h3>
              <p className="text-xs font-mono text-[var(--organizer-ink-muted)] leading-relaxed mb-6 uppercase">
                Form or join a team, manage invite links, and assign builder roles.
              </p>
            </div>

            <Link
              href="/team"
              className="w-full py-3 bg-[var(--organizer-gold)] border-2 border-[var(--organizer-ink-primary)] text-[var(--organizer-ink-primary)] font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold-deep)] hover:text-white transition-colors"
              style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
            >
              MANAGE TEAM →
            </Link>
          </div>

          {/* Module 3: Project Submissions */}
          <div
            className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 flex flex-col justify-between"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
          >
            <div>
              <div className="w-10 h-10 bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center mb-4">
                <FileCode className="w-5 h-5 text-[var(--organizer-ink-primary)]" />
              </div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">
                PROJECT SUBMISSIONS
              </h3>
              <p className="text-xs font-mono text-[var(--organizer-ink-muted)] leading-relaxed mb-6 uppercase">
                Submit repository links, demo videos, tech stacks, and AI briefings.
              </p>
            </div>

            <Link
              href="/submit"
              className="w-full py-3 bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] text-[var(--organizer-ink-primary)] font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--organizer-gold)] transition-colors"
              style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
            >
              SUBMIT PROJECT →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}