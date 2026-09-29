"use client";

import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { 
  Calendar, MapPin, Sparkles, Search, ArrowRight, 
  Layers, Zap, Code2, Cpu, Globe, Radio, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// --- ANIMATION VARIANTS ---
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

// --- TYPES ---
interface Hackathon {
  id: string;
  slug: string;
  title: string;
  edition: string;
  status: "live" | "upcoming" | "completed";
  tagline: string;
  start_date: string;
  location: string;
  registrants: number;
  prize_pool: string;
  tracks: string[];
  logo_background: string;
  icon_name: string;
}

// --- ICON MAPPER ---
// Maps the string from Supabase to a real Lucide React icon
const getIcon = (iconName: string, className: string) => {
  const icons: Record<string, React.ReactNode> = {
    cpu: <Cpu className={className} />,
    code: <Code2 className={className} />,
    layers: <Layers className={className} />,
    globe: <Globe className={className} />,
    zap: <Zap className={className} />,
  };
  return icons[iconName.toLowerCase()] || <Code2 className={className} />; // Fallback icon
};

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTrack, setFilterTrack] = useState("ALL");

  // Initialize Supabase Client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch Data from Supabase
  useEffect(() => {
    const fetchHackathons = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Error fetching hackathons:", error);
      } else if (data) {
        setHackathons(data as Hackathon[]);
      }
      setIsLoading(false);
    };

    fetchHackathons();
  }, [supabase]);

  // Dynamically generate tracks based on fetched data
  const uniqueTracks = [
    "ALL",
    ...Array.from(new Set(hackathons.flatMap((h) => h.tracks))).map(t => t.toUpperCase()),
  ];

  // Filter Logic
  const filteredHackathons = hackathons.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.tagline.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrack =
      filterTrack === "ALL" ||
      h.tracks.some((t) => t.toUpperCase() === filterTrack.toUpperCase());
    return matchesSearch && matchesTrack;
  });

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24">
      {/* Background Grid */}
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

      {/* Floating Elements */}
      <motion.div
        variants={floatVariantsOne}
        animate="animate"
        className="pointer-events-none absolute top-20 right-16 hidden lg:flex h-20 w-20 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-white shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] z-10"
      >
        <Zap className="h-10 w-10 fill-white stroke-[var(--organizer-ink-primary)] stroke-2" />
      </motion.div>

      <motion.div
        variants={floatVariantsTwo}
        animate="animate"
        className="pointer-events-none absolute top-96 left-12 hidden lg:flex h-16 w-16 rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-2 shadow-[6px_6px_0px_0px_var(--organizer-gold)] z-10 items-center justify-center"
      >
        <div className="h-6 w-6 rounded-full bg-[var(--organizer-gold-deep)] animate-pulse" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)] mb-4">
                <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                ACTIVE CHAMPIONSHIPS & COHORTS
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-display tracking-tighter uppercase leading-none">
                HACKATHON <span className="text-[var(--organizer-gold-deep)]">ARENA.</span>
              </h1>
            </div>

            <Link
              href="/organizer/new"
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            >
              HOST AN EVENT
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
            <input
              type="text"
              placeholder="SEARCH HACKATHONS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading || hackathons.length === 0}
              className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] py-3 pl-10 pr-4 text-xs font-mono font-bold uppercase tracking-wider placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)] disabled:opacity-50"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            />
          </div>

          {!isLoading && hackathons.length > 0 && (
            <div className="flex flex-wrap gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-1 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
              {uniqueTracks.map((track) => (
                <button
                  key={track}
                  onClick={() => setFilterTrack(track)}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase transition-colors ${
                    filterTrack === track
                      ? "bg-[var(--organizer-gold)] text-white border border-[var(--organizer-ink-primary)]"
                      : "text-[var(--organizer-ink-secondary)] hover:text-[var(--organizer-ink-primary)]"
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LOADING STATE (Skeleton) */}
        {isLoading && (
          <div className="space-y-12 animate-pulse">
            <div className="h-64 w-full bg-[var(--organizer-border)] border-2 border-[var(--organizer-ink-primary)]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-[var(--organizer-border)] border-2 border-[var(--organizer-ink-primary)]" />
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE (No Data) */}
        {!isLoading && hackathons.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}>
            <AlertCircle className="h-16 w-16 text-[var(--organizer-gold)] mb-4" />
            <h2 className="text-3xl font-black font-display uppercase tracking-tight text-[var(--organizer-ink-primary)] mb-2">No Events Found</h2>
            <p className="text-sm font-mono font-bold text-[var(--organizer-ink-muted)] mb-6 text-center max-w-md">
              The arena is empty. Be the first organizer to launch a world-class hackathon on IHI.
            </p>
            <Link
              href="/organizer/new"
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-6 py-3 text-sm font-bold font-mono uppercase tracking-wider text-white transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
            >
              LAUNCH YOUR HACKATHON
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* LIVE HACKATHONS */}
        {!isLoading && filteredHackathons.some((h) => h.status === "live") && (
          <div className="mb-12">
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-4">
              <Radio className="h-3.5 w-3.5 text-red-600 animate-pulse" />
              ONGOING HACKATHON
            </div>
            {filteredHackathons
              .filter((h) => h.status === "live")
              .map((hack) => (
                <div
                  key={hack.id}
                  className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-6 md:p-8 relative transition-transform hover:-translate-y-1"
                  style={{ boxShadow: "10px 10px 0px 0px var(--organizer-gold)" }}
                >
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 border-2 border-[var(--organizer-ink-primary)] bg-red-600 px-3 py-1 text-[9px] font-mono font-black uppercase text-white animate-pulse">
                    LIVE SYSTEM ACTIVE
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] shadow-[3px_3px_0px_0px_var(--organizer-ink-primary)]">
                          {getIcon(hack.icon_name, "h-6 w-6 text-[var(--organizer-gold-deep)]")}
                        </div>
                        <div>
                          <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight leading-none text-[var(--organizer-ink-primary)]">
                            {hack.title} <span className="text-[var(--organizer-gold-deep)]">{hack.edition}</span>
                          </h2>
                          <div className="text-[10px] font-mono font-bold text-[var(--organizer-ink-muted)] mt-1">
                            {hack.start_date} // {hack.location}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs md:text-sm font-mono font-bold text-[var(--organizer-ink-secondary)] leading-relaxed max-w-3xl">
                        {hack.tagline}
                      </p>

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
                    </div>

                    <div className="lg:col-span-4 border-l-0 lg:border-l-2 border-[var(--organizer-ink-primary)] pl-0 lg:pl-8 space-y-4">
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
                            {hack.prize_pool}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={`/hackathons/${hack.slug}`}
                          className="w-full inline-flex items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] text-white py-3 text-xs font-mono font-black uppercase tracking-wider transition-transform hover:-translate-x-1 hover:-translate-y-1"
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

        {/* UPCOMING HACKATHONS */}
        {!isLoading && filteredHackathons.some((h) => h.status === "upcoming") && (
          <div>
            <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-4">
              🗓️ UPCOMING HACKATHONS
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {filteredHackathons
                .filter((h) => h.status === "upcoming")
                .map((hack) => (
                  <motion.div
                    key={hack.id}
                    variants={cardVariants}
                    className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-2 hover:-translate-x-1 flex flex-col justify-between h-full"
                    style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b-2 border-[var(--organizer-border)] pb-3">
                        <div 
                          className="flex h-10 w-10 items-center justify-center border-2 border-[var(--organizer-ink-primary)]" 
                          style={{ backgroundColor: hack.logo_background }}
                        >
                          {getIcon(hack.icon_name, "h-5 w-5 text-[var(--organizer-ink-primary)]")}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-black text-[var(--organizer-gold-deep)]">
                            {hack.title}
                          </div>
                          <div className="text-[9px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                            {hack.edition}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-black font-display uppercase tracking-tight text-[var(--organizer-ink-primary)] leading-tight">
                          {hack.tagline}
                        </h3>
                        
                        <div className="space-y-1 text-[11px] font-mono font-bold text-[var(--organizer-ink-muted)] pt-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[var(--organizer-gold)] flex-shrink-0" />
                            <span className="truncate">{hack.start_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[var(--organizer-gold)] flex-shrink-0" />
                            <span className="truncate">{hack.location}</span>
                          </div>
                        </div>
                      </div>

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
                    </div>

                    <div className="mt-6 border-t-2 border-[var(--organizer-border)] pt-4 flex items-center justify-between">
                      <div>
                        <div className="text-[8px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)]">
                          PRIZE POOL
                        </div>
                        <div className="text-xs font-black font-mono text-[var(--organizer-ink-primary)]">
                          {hack.prize_pool}
                        </div>
                      </div>

                      <Link
                        href={`/hackathons/${hack.slug}`}
                        className="inline-flex items-center gap-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
                        style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                      >
                        VIEW EVENT
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}