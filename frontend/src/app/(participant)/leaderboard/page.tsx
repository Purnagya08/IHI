"use client";

import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { 
  Trophy, 
  Flame, 
  ArrowUpRight, 
  Crown, 
  Search 
} from "lucide-react";
import Link from "next/link";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const floatVariantsOne: Variants = {
  animate: {
    y: [0, -14, 0],
    rotate: [12, 18, 6, 12],
    transition: {
      duration: 5.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const floatVariantsTwo: Variants = {
  animate: {
    y: [0, 14, 0],
    rotate: [-10, -4, -16, -10],
    transition: {
      duration: 6.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

interface LeaderboardEntry {
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
}

export default function LeaderboardPage() {
  const [filterTime, setFilterTime] = useState<"all" | "season" | "month">("season");
  const [searchTerm, setSearchTerm] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard/global");
        if (res.ok) {
          const data = await res.json();
          if (data.entries) {
            setEntries(data.entries);
          }
        }
      } catch (err) {
        console.error("Failed to load global leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGlobalLeaderboard();
  }, []);

  const filteredEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const podium1 = entries[0] || null;
  const podium2 = entries[1] || null;
  const podium3 = entries[2] || null;

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24">
      {/* Blueprint Graph-Paper Grid */}
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

      {/* Floating Geometric Elements */}
      <motion.div
        variants={floatVariantsOne}
        animate="animate"
        className="pointer-events-none absolute top-16 right-16 hidden lg:flex h-20 w-20 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-white shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] z-10"
      >
        <Crown className="h-10 w-10 stroke-[var(--organizer-ink-primary)] stroke-2 fill-white" />
      </motion.div>

      <motion.div
        variants={floatVariantsTwo}
        animate="animate"
        className="pointer-events-none absolute top-80 left-10 hidden lg:flex h-16 w-16 rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-2 shadow-[6px_6px_0px_0px_var(--organizer-gold)] z-10 items-center justify-center"
      >
        <div className="h-6 w-6 bg-[var(--organizer-gold-deep)] rotate-45" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)] mb-4">
                <Trophy className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                GLOBAL COMPETITIVE STANDINGS
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-display tracking-tighter uppercase leading-none">
                GLOBAL <span className="text-[var(--organizer-gold-deep)]">LEADERBOARD.</span>
              </h1>
            </div>

            {/* Time Filter Tabs */}
            <div className="flex border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-1 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
              {(["season", "month", "all"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTime(tab)}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors ${
                    filterTime === tab
                      ? "bg-[var(--organizer-gold)] text-white border-2 border-[var(--organizer-ink-primary)]"
                      : "text-[var(--organizer-ink-secondary)] hover:text-[var(--organizer-ink-primary)]"
                  }`}
                >
                  {tab === "season" ? "SEASON 2026" : tab === "month" ? "THIS MONTH" : "ALL-TIME"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Podium Section (Top 3) */}
        {!loading && (podium1 || podium2 || podium3) && (
          <div className="mb-14 grid grid-cols-1 gap-6 md:grid-cols-3 items-end">
            
            {/* Rank 2 (Silver / Left) */}
            {podium2 ? (
              <div
                className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-2 order-2 md:order-1"
                style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
              >
                <div className="flex items-center justify-between mb-4 border-b-2 border-[var(--organizer-border)] pb-3">
                  <span className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface-hover)] px-2.5 py-0.5 text-xs font-mono font-black">
                    #2 SILVER
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                    {podium2.tier}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={podium2.avatar}
                    alt={podium2.name}
                    className="h-16 w-16 border-2 border-[var(--organizer-ink-primary)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-black font-display uppercase tracking-tight truncate">
                      {podium2.name}
                    </div>
                    <div className="text-xs font-mono text-[var(--organizer-gold-deep)] font-bold">
                      @{podium2.handle}
                    </div>
                    <div className="mt-2 text-2xl font-black font-display text-[var(--organizer-ink-primary)]">
                      {podium2.points.toLocaleString()}{" "}
                      <span className="text-xs font-mono font-normal text-[var(--organizer-ink-muted)]">PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="order-2 md:order-1" />}

            {/* Rank 1 (Gold / Center / Elevated) */}
            {podium1 ? (
              <div
                className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-8 transition-transform hover:-translate-y-3 order-1 md:order-2 relative"
                style={{ boxShadow: "10px 10px 0px 0px var(--organizer-gold)" }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-4 py-1 text-xs font-mono font-black uppercase text-white shadow-[2px_2px_0px_0px_var(--organizer-ink-primary)]">
                  👑 REIGNING CHAMPION
                </div>
                <div className="flex items-center justify-between mb-4 border-b-2 border-[var(--organizer-ink-primary)] pb-3 pt-2">
                  <span className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-3 py-1 text-xs font-mono font-black text-white">
                    #1 GOLD
                  </span>
                  <span className="text-[11px] font-mono font-black uppercase text-[var(--organizer-gold-deep)]">
                    {podium1.tier}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={podium1.avatar}
                    alt={podium1.name}
                    className="h-20 w-20 border-2 border-[var(--organizer-ink-primary)] object-cover shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xl font-black font-display uppercase tracking-tight truncate">
                      {podium1.name}
                    </div>
                    <div className="text-xs font-mono text-[var(--organizer-gold-deep)] font-bold">
                      @{podium1.handle}
                    </div>
                    <div className="mt-2 text-3xl font-black font-display text-[var(--organizer-ink-primary)]">
                      {podium1.points.toLocaleString()}{" "}
                      <span className="text-xs font-mono font-normal text-[var(--organizer-ink-muted)]">PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="order-1 md:order-2" />}

            {/* Rank 3 (Bronze / Right) */}
            {podium3 ? (
              <div
                className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-2 order-3"
                style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
              >
                <div className="flex items-center justify-between mb-4 border-b-2 border-[var(--organizer-border)] pb-3">
                  <span className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface-hover)] px-2.5 py-0.5 text-xs font-mono font-black">
                    #3 BRONZE
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">
                    {podium3.tier}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={podium3.avatar}
                    alt={podium3.name}
                    className="h-16 w-16 border-2 border-[var(--organizer-ink-primary)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-black font-display uppercase tracking-tight truncate">
                      {podium3.name}
                    </div>
                    <div className="text-xs font-mono text-[var(--organizer-gold-deep)] font-bold">
                      @{podium3.handle}
                    </div>
                    <div className="mt-2 text-2xl font-black font-display text-[var(--organizer-ink-primary)]">
                      {podium3.points.toLocaleString()}{" "}
                      <span className="text-xs font-mono font-normal text-[var(--organizer-ink-muted)]">PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="order-3" />}

          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
            <input
              type="text"
              placeholder="SEARCH OPERATOR BY NAME OR HANDLE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-3 pl-10 pr-4 text-xs font-mono font-bold uppercase tracking-wider placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            />
          </div>

          <div className="text-xs font-mono font-bold text-[var(--organizer-ink-muted)] uppercase">
            SHOWING {filteredEntries.length} CLASSIFIED ENTRIES
          </div>
        </div>

        {/* Loading Skeleton State */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse border-2 border-[var(--organizer-border)] bg-[var(--organizer-surface)]"
              />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div
            className="flex py-16 flex-col items-center justify-center border-2 border-dashed border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] text-center"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
          >
            <Trophy className="mb-3 h-10 w-10 text-[var(--organizer-ink-muted)]" />
            <h3 className="font-display text-xl font-black uppercase">NO HACKERS FOUND</h3>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              CLEAR YOUR SEARCH QUERY OR REGISTER PARTICIPANTS IN SUPABASE
            </p>
          </div>
        ) : (
          /* Leaderboard Table List */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredEntries.map((entry) => (
              <motion.div
                key={entry.id}
                variants={cardVariants}
                className="group flex flex-wrap items-center justify-between gap-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
              >
                <div className="flex items-center gap-4 min-w-[240px]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] font-mono font-black text-sm">
                    #{entry.rank}
                  </div>
                  <img
                    src={entry.avatar}
                    alt={entry.name}
                    className="h-10 w-10 border border-[var(--organizer-ink-primary)] object-cover"
                  />
                  <div>
                    <div className="font-display font-black uppercase text-sm tracking-tight group-hover:text-[var(--organizer-gold-deep)] transition-colors">
                      {entry.name}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                      @{entry.handle}
                    </div>
                  </div>
                </div>

                {/* Stats badges */}
                <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                  <div className="text-left">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      VICTORIES
                    </div>
                    <div className="font-black text-sm text-[var(--organizer-ink-primary)]">
                      {entry.wins} WINS
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      BUILD STREAK
                    </div>
                    <div className="font-black text-sm text-[var(--organizer-gold-deep)] flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 fill-[var(--organizer-gold)]" />
                      {entry.streak}D
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      MEDALS
                    </div>
                    <div className="font-black text-sm text-[var(--organizer-ink-primary)]">
                      {entry.badgeCount}
                    </div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      TOTAL SCORE
                    </div>
                    <div className="text-lg font-black font-display text-[var(--organizer-ink-primary)]">
                      {entry.points.toLocaleString()}
                    </div>
                  </div>

                  <Link
                    href={`/profile?userId=${encodeURIComponent(entry.id)}`}
                    className="flex h-9 w-9 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] transition-colors hover:bg-[var(--organizer-gold)] hover:text-white"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}