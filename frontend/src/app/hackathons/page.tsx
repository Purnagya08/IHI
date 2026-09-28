"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Calendar,
  MapPin,
  Sparkles,
  Search,
  ArrowRight,
  Layers,
  Zap,
  Code2,
  Cpu,
  Globe,
  Radio,
  User,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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

const floatVariantsOne: Variants = {
  animate: {
    y: [0, -15, 0],
    rotate: [12, 17, 7, 12],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

const floatVariantsTwo: Variants = {
  animate: {
    y: [0, 15, 0],
    rotate: [-8, -3, -13, -8],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
  },
};

interface Hackathon {
  id: string;
  title: string;
  edition: string;
  status: "live" | "upcoming" | "completed";
  tagline: string;
  startDate: string;
  location: string;
  registrants: number;
  prizePool: string;
  tracks: string[];
  logoBackground: string;
  iconKey: string;
}

function pickIcon(key: string) {
  switch (key) {
    case "cpu":
      return <Cpu className="h-8 w-8 text-[var(--organizer-gold-deep)]" />;
    case "code":
      return <Code2 className="h-8 w-8 text-[var(--organizer-ink-primary)]" />;
    case "layers":
      return <Layers className="h-8 w-8 text-[var(--organizer-ink-secondary)]" />;
    case "globe":
      return <Globe className="h-8 w-8 text-[var(--organizer-gold-deep)]" />;
    default:
      return <Zap className="h-8 w-8 text-[var(--organizer-gold-deep)]" />;
  }
}

function formatEventDate(
  start?: string | null,
  end?: string | null,
  status?: string
) {
  if (!start) return "TBA";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "TBA";

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (status === "live") {
    return `HAPPENING NOW // ${s.toLocaleDateString("en-US", opts).toUpperCase()}`;
  }

  if (end) {
    const e = new Date(end);
    if (!Number.isNaN(e.getTime())) {
      return `${s
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toUpperCase()} - ${e.toLocaleDateString("en-US", opts).toUpperCase()}`;
    }
  }

  return s.toLocaleDateString("en-US", opts).toUpperCase();
}

/** Normalize DB status + dates → live | upcoming | completed */
function deriveStatus(
  start?: string | null,
  end?: string | null,
  raw?: string | null
): "live" | "upcoming" | "completed" {
  const normalized = (raw || "").toLowerCase().trim();

  if (["live", "active", "ongoing", "in_progress", "running"].includes(normalized)) {
    return "live";
  }
  if (["completed", "ended", "past", "finished", "closed"].includes(normalized)) {
    return "completed";
  }
  if (["upcoming", "scheduled", "published", "open", "draft"].includes(normalized)) {
    // still allow date override below for published+started
  }

  const now = Date.now();
  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;

  if (!Number.isNaN(s) && !Number.isNaN(e) && now >= s && now <= e) return "live";
  if (!Number.isNaN(s) && now < s) return "upcoming";
  if (!Number.isNaN(e) && now > e) return "completed";
  if (!Number.isNaN(s) && now >= s) return "live";

  if (["upcoming", "scheduled", "published", "open"].includes(normalized)) {
    return "upcoming";
  }

  return "upcoming";
}

function formatPrize(value: unknown): string {
  if (value == null || value === "") return "$0";
  const str = String(value);
  if (str.startsWith("$")) return str;
  const num = Number(value);
  if (Number.isFinite(num)) return `$${num.toLocaleString()}`;
  return str;
}

function mapRow(row: Record<string, unknown>): Hackathon {
  const start = (row.start_date || row.starts_at || row.startDate) as string | null;
  const end = (row.end_date || row.ends_at || row.endDate) as string | null;
  const rawStatus = (row.status || row.phase || row.state) as string | null;
  const status = deriveStatus(start, end, rawStatus);

  const title = String(row.title || row.name || row.event_name || "UNTITLED EVENT").toUpperCase();
  const id = String(row.slug || row.id || crypto.randomUUID());

  let tracks: string[] = [];
  if (Array.isArray(row.tracks)) {
    tracks = row.tracks.map((t) => String(t).toUpperCase());
  } else if (typeof row.tracks === "string" && row.tracks.trim()) {
    try {
      const parsed = JSON.parse(row.tracks);
      if (Array.isArray(parsed)) tracks = parsed.map((t) => String(t).toUpperCase());
      else tracks = row.tracks.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    } catch {
      tracks = row.tracks.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    }
  }

  return {
    id,
    title,
    edition: String(row.edition || row.season || "").toUpperCase(),
    status,
    tagline: String(
      row.tagline || row.description || row.summary || "NO BRIEFING PROVIDED FOR THIS EVENT NODE."
    ).toUpperCase(),
    startDate: formatEventDate(start, end, status),
    location: String(row.location || row.venue || row.city || "TBA").toUpperCase(),
    registrants: Number(
      row.registrant_count || row.registrants || row.participant_count || row.builders || 0
    ),
    prizePool: formatPrize(row.prize_pool || row.prizePool || row.prize),
    tracks,
    logoBackground: String(row.cover_color || row.logo_background || "var(--organizer-gold-light)"),
    iconKey: String(row.icon_key || row.icon || "zap"),
  };
}

export default function HackathonsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTrack, setFilterTrack] = useState("ALL");
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setDbError(null);

      try {
        // Prefer published/public events if column exists; fall back to all rows
        let query = supabase.from("events").select("*");

        // Optional: only show non-draft if your schema has is_published
        // query = query.eq("is_published", true);

        const { data, error: qErr } = await query.order("start_date", {
          ascending: true,
          nullsFirst: false,
        });

        if (cancelled) return;

        if (qErr) {
          // Table missing / RLS / network — show empty registry, not dummy cards
          console.warn("events query:", qErr.message || qErr);
          setDbError(qErr.message || "Could not load events");
          setHackathons([]);
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        // No dummy fallback — empty array if DB has zero rows
        setHackathons(rows.map((row) => mapRow(row as Record<string, unknown>)));
      } catch (err: unknown) {
        if (cancelled) return;
        console.warn("Could not query Supabase events:", err);
        setDbError(err instanceof Error ? err.message : "Unknown error");
        setHackathons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const uniqueTracks = useMemo(() => {
    const set = new Set<string>();
    hackathons.forEach((h) => h.tracks.forEach((t) => set.add(t)));
    return ["ALL", ...Array.from(set)];
  }, [hackathons]);

  const filteredHackathons = hackathons.filter((h) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      h.title.toLowerCase().includes(q) ||
      h.tagline.toLowerCase().includes(q) ||
      h.edition.toLowerCase().includes(q);
    const matchesTrack =
      filterTrack === "ALL" ||
      h.tracks.some((t) => t.toUpperCase() === filterTrack.toUpperCase());
    return matchesSearch && matchesTrack;
  });

  const liveEvents = filteredHackathons.filter((h) => h.status === "live");
  const upcomingEvents = filteredHackathons.filter((h) => h.status === "upcoming");
  // completed intentionally hidden from arena (or add a tab later)

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24">
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

      <motion.div
        variants={floatVariantsOne}
        animate="animate"
        className="pointer-events-none absolute top-20 right-16 z-10 hidden h-20 w-20 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-white shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] lg:flex"
      >
        <Zap className="h-10 w-10 fill-white stroke-[var(--organizer-ink-primary)] stroke-2" />
      </motion.div>

      <motion.div
        variants={floatVariantsTwo}
        animate="animate"
        className="pointer-events-none absolute top-96 left-12 z-10 hidden h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-2 shadow-[6px_6px_0px_0px_var(--organizer-gold)] lg:flex"
      >
        <div className="h-6 w-6 animate-pulse rounded-full bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                ACTIVE CHAMPIONSHIPS &amp; COHORTS
              </div>
              <h1 className="text-5xl font-black font-display uppercase leading-none tracking-tighter md:text-7xl">
                HACKATHON <span className="text-[var(--organizer-gold-deep)]">ARENA.</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/sponsors/register"
                className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
              >
                SPONSOR AN EVENT
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
              >
                <User className="h-4 w-4" />
                MY PROFILE
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--organizer-ink-muted)]" />
            <input
              type="text"
              placeholder="SEARCH HACKATHONS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-3 pl-10 pr-4 text-xs font-mono font-bold uppercase tracking-wider placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            />
          </div>

          {uniqueTracks.length > 1 && (
            <div className="flex flex-wrap gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-1 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
              {uniqueTracks.map((track) => (
                <button
                  key={track}
                  type="button"
                  onClick={() => setFilterTrack(track)}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase transition-colors ${
                    filterTrack === track
                      ? "border border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-white"
                      : "text-[var(--organizer-ink-secondary)] hover:text-[var(--organizer-ink-primary)]"
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div
            className="flex flex-col items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-20"
            style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
          >
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--organizer-gold-deep)]" />
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              QUERYING EVENT REGISTRY...
            </p>
          </div>
        )}

        {!loading && hackathons.length === 0 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-24 text-center">
            <Sparkles className="mb-4 h-10 w-10 text-[var(--organizer-ink-muted)]" />
            <h2 className="mb-2 font-display text-2xl font-black uppercase tracking-tighter">
              NO EVENTS IN REGISTRY
            </h2>
            <p className="max-w-md font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              {dbError
                ? `Database: ${dbError}`
                : "Organizers have not published any hackathons yet. Create one from the organizer console."}
            </p>
          </div>
        )}

        {!loading && liveEvents.length > 0 && (
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              <Radio className="h-3.5 w-3.5 animate-pulse text-red-600" />
              ONGOING HACKATHON
            </div>
            {liveEvents.map((hack) => (
              <div
                key={hack.id}
                className="relative mb-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-6 transition-transform hover:-translate-y-1 md:p-8"
                style={{ boxShadow: "10px 10px 0px 0px var(--organizer-gold)" }}
              >
                <div className="absolute right-4 top-4 animate-pulse border-2 border-[var(--organizer-ink-primary)] bg-red-600 px-3 py-1 text-[9px] font-mono font-black uppercase text-white md:right-6 md:top-6">
                  LIVE SYSTEM ACTIVE
                </div>
                <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] shadow-[3px_3px_0px_0px_var(--organizer-ink-primary)]">
                        {pickIcon(hack.iconKey)}
                      </div>
                      <div>
                        <h2 className="text-3xl font-black font-display leading-none tracking-tight text-[var(--organizer-ink-primary)] md:text-5xl">
                          {hack.title}{" "}
                          {hack.edition && (
                            <span className="text-[var(--organizer-gold-deep)]">{hack.edition}</span>
                          )}
                        </h2>
                        <div className="mt-1 text-[10px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                          {hack.startDate} // {hack.location}
                        </div>
                      </div>
                    </div>
                    <p className="max-w-3xl text-xs font-mono font-bold leading-relaxed text-[var(--organizer-ink-secondary)] md:text-sm">
                      {hack.tagline}
                    </p>
                    {hack.tracks.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {hack.tracks.map((track) => (
                          <span
                            key={track}
                            className="border border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-2.5 py-0.5 text-[9px] font-bold font-mono uppercase text-[var(--organizer-ink-primary)]"
                          >
                            {track}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 border-[var(--organizer-ink-primary)] pl-0 lg:col-span-4 lg:border-l-2 lg:pl-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[9px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)]">
                          TOTAL RECRUITS
                        </div>
                        <div className="text-2xl font-black font-display text-[var(--organizer-ink-primary)]">
                          {hack.registrants.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)]">
                          PRIZE POOL
                        </div>
                        <div className="text-2xl font-black font-display text-[var(--organizer-gold-deep)]">
                          {hack.prizePool}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/events/${hack.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] py-3 text-xs font-mono font-black uppercase tracking-wider text-white transition-transform hover:-translate-x-1 hover:-translate-y-1"
                        style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
                      >
                        ENTER WORKSPACE
                        <ArrowRight className="h-4 w-4 text-[var(--organizer-gold)]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && upcomingEvents.length > 0 && (
          <div>
            <div className="mb-4 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              UPCOMING HACKATHONS
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {upcomingEvents.map((hack) => (
                <motion.div
                  key={hack.id}
                  variants={cardVariants}
                  className="flex flex-col justify-between border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-x-1 hover:-translate-y-2"
                  style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-[var(--organizer-border)] pb-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center border-2 border-[var(--organizer-ink-primary)]"
                        style={{ backgroundColor: hack.logoBackground }}
                      >
                        {pickIcon(hack.iconKey)}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-[var(--organizer-gold-deep)]">
                          {hack.title}
                        </div>
                        {hack.edition && (
                          <div className="text-[9px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                            {hack.edition}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black font-display uppercase tracking-tight text-[var(--organizer-ink-primary)]">
                        {hack.tagline}
                      </h3>
                      <div className="space-y-1 text-[11px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[var(--organizer-gold)]" />
                          <span>{hack.startDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[var(--organizer-gold)]" />
                          <span>{hack.location}</span>
                        </div>
                      </div>
                    </div>
                    {hack.tracks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {hack.tracks.slice(0, 2).map((track) => (
                          <span
                            key={track}
                            className="border border-[var(--organizer-border)] bg-[var(--organizer-bg)] px-2 py-0.5 text-[8px] font-bold font-mono uppercase text-[var(--organizer-ink-secondary)]"
                          >
                            {track}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t-2 border-[var(--organizer-border)] pt-4">
                    <div>
                      <div className="text-[8px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)]">
                        EXPECTED BUILDERS
                      </div>
                      <div className="text-xs font-black font-mono text-[var(--organizer-ink-primary)]">
                        {hack.registrants} PARTICIPANTS
                      </div>
                    </div>
                    <Link
                      href={`/events/${hack.id}`}
                      className="inline-flex items-center gap-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
                      style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                    >
                      REGISTER
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {!loading &&
          hackathons.length > 0 &&
          liveEvents.length === 0 &&
          upcomingEvents.length === 0 && (
            <div
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-10 text-center font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            >
              NO EVENTS MATCH YOUR FILTERS
            </div>
          )}
      </div>
    </div>
  );
}