"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { 
  Flame, 
  Award, 
  Star, 
  GitCommit, 
  Github, 
  Linkedin, 
  Globe, 
  MapPin, 
  Calendar,
  ShieldCheck,
  Zap,
  Code2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ContributionHeatmap from "@/components/profile/ContributionHeatmap";

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
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const floatVariantsOne: Variants = {
  animate: {
    y: [0, -15, 0], rotate: [12, 17, 7, 12],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

const floatVariantsTwo: Variants = {
  animate: {
    y: [0, 15, 0], rotate: [-8, -3, -13, -8],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
  },
};

interface ProfileData {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  location: string;
  joinedDate: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  rank: number;
  points: number;
  streakDays: number;
  hackathonsWon: number;
  hackathonsAttended: number;
  skills: string[];
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: "gold" | "silver" | "bronze" | "obsidian";
    unlockedAt: string;
  }>;
}

const ZERO_PROFILE: ProfileData = {
  id: "",
  name: "ANONYMOUS HACKER",
  handle: "new_builder",
  bio: "No dossier summary provided yet. Update your profile to stand out.",
  avatarUrl: "",
  location: "Unknown / Remote",
  joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
  githubUrl: "#",
  linkedinUrl: "#",
  websiteUrl: "#",
  rank: 0,
  points: 0,
  streakDays: 0,
  hackathonsWon: 0,
  hackathonsAttended: 0,
  skills: [],
  badges: [],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(ZERO_PROFILE);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        // Fetch active session user from verified JWT cookie
        const meRes = await fetch("/api/auth/me");
        let sessionUser: any = null;

        if (meRes.ok) {
          const meData = await meRes.json();
          sessionUser = meData.user || meData;
        }

        // Fallback to Supabase auth if API auth endpoint not present
        if (!sessionUser || !sessionUser.email) {
          const { data: { session } } = await supabase.auth.getSession();
          sessionUser = session?.user;
        }

        if (!sessionUser || !sessionUser.email) {
          setLoading(false);
          return;
        }

        const derivedName = (sessionUser.name || sessionUser.user_metadata?.full_name || sessionUser.email.split("@")[0]).toUpperCase();
        const derivedHandle = (sessionUser.email.split("@")[0]).toLowerCase();

        let currentProfile: ProfileData = {
          ...ZERO_PROFILE,
          id: sessionUser.id || "",
          name: derivedName,
          handle: derivedHandle,
          location: "Remote",
          joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
        };

        // Query Supabase for custom profile details if row exists
        if (sessionUser.id) {
          const { data, error } = await supabase
            .from("profiles")
            .select(`
              id, full_name, username, bio, avatar_url, location, created_at,
              github_url, linkedin_url, website_url, rank, points, streak_days,
              hackathons_won, hackathons_attended, skills,
              user_badges ( badges ( id, name, description, icon, tier ), unlocked_at )
            `)
            .eq("id", sessionUser.id)
            .maybeSingle();

          if (data && !error) {
            currentProfile = {
              id: data.id,
              name: (data.full_name || derivedName).toUpperCase(),
              handle: data.username || derivedHandle,
              bio: data.bio || ZERO_PROFILE.bio,
              avatarUrl: data.avatar_url || "",
              location: data.location || ZERO_PROFILE.location,
              joinedDate: new Date(data.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
              githubUrl: data.github_url || "#",
              linkedinUrl: data.linkedin_url || "#",
              websiteUrl: data.website_url || "#",
              rank: data.rank || 0,
              points: data.points || 0,
              streakDays: data.streak_days || 0,
              hackathonsWon: data.hackathons_won || 0,
              hackathonsAttended: data.hackathons_attended || 0,
              skills: data.skills || [],
              badges: data.user_badges?.map((ub: any) => ({
                id: ub.badges.id,
                name: ub.badges.name,
                description: ub.badges.description,
                icon: ub.badges.icon,
                tier: ub.badges.tier,
                unlockedAt: ub.unlocked_at,
              })) || [],
            };
          }
        }

        setProfile(currentProfile);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  if (loading) return null;

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24">
      {/* Blueprint Grid Background */}
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
      <motion.div variants={floatVariantsOne} animate="animate" className="pointer-events-none absolute top-20 right-12 hidden lg:flex h-20 w-20 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-white shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] z-10">
        <Star className="h-10 w-10 fill-white stroke-[var(--organizer-ink-primary)] stroke-2" />
      </motion.div>

      <motion.div variants={floatVariantsTwo} animate="animate" className="pointer-events-none absolute top-72 left-8 hidden lg:flex h-16 w-16 rounded-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-2 shadow-[6px_6px_0px_0px_var(--organizer-gold)] z-10 items-center justify-center">
        <div className="h-6 w-6 rounded-full bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)] mb-4">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                VERIFIED OPERATOR DOSSIER
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-display tracking-tighter uppercase leading-none">
                HACKER <span className="text-[var(--organizer-gold-deep)]">DOSSIER.</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <a href="/hackathons" className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}>
                RETURN TO EVENTS
              </a>
              <button type="button" className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}>
                <Zap className="h-4 w-4" />
                EDIT PROFILE
              </button>
            </div>
          </div>
        </div>

        {/* Profile Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Identity Card */}
          <motion.div variants={cardVariants} className="lg:col-span-4 space-y-6">
            <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-gold)" }}>
              {/* Avatar Frame */}
              <div className="relative mb-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-2 h-48 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover border border-[var(--organizer-ink-primary)]" />
                ) : (
                  <span className="font-display text-6xl font-black text-[var(--organizer-gold-deep)]">
                    {profile.name.substring(0, 2)}
                  </span>
                )}
                <div className="absolute -bottom-3 right-3 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-3 py-0.5 text-[10px] font-bold font-mono uppercase text-white">
                  RANK #{profile.rank === 0 ? "-" : profile.rank}
                </div>
              </div>

              {/* Bio & Identifiers */}
              <div className="space-y-3">
                <h2 className="text-2xl font-black font-display tracking-tight text-[var(--organizer-ink-primary)]">
                  {profile.name}
                </h2>
                <div className="text-xs font-mono font-bold text-[var(--organizer-gold-deep)]">
                  @{profile.handle}
                </div>
                <p className="text-xs leading-relaxed text-[var(--organizer-ink-secondary)] font-mono border-t-2 border-[var(--organizer-border)] pt-3">
                  {profile.bio}
                </p>
              </div>

              {/* Meta Info */}
              <div className="mt-6 space-y-2 border-t-2 border-[var(--organizer-border)] pt-4 text-[11px] font-mono font-bold text-[var(--organizer-ink-muted)]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                  <span>MEMBER SINCE {profile.joinedDate}</span>
                </div>
              </div>

              {/* Links */}
              <div className="mt-6 flex items-center gap-2 border-t-2 border-[var(--organizer-border)] pt-4">
                <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] text-[var(--organizer-ink-primary)] transition-transform hover:-translate-y-1 hover:bg-[var(--organizer-gold-light)]" style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}><Github className="h-4 w-4" /></a>
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] text-[var(--organizer-ink-primary)] transition-transform hover:-translate-y-1 hover:bg-[var(--organizer-gold-light)]" style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}><Linkedin className="h-4 w-4" /></a>
                <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] text-[var(--organizer-ink-primary)] transition-transform hover:-translate-y-1 hover:bg-[var(--organizer-gold-light)]" style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}><Globe className="h-4 w-4" /></a>
              </div>
            </div>

            {/* Skills Tech Stack */}
            <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1" style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}>
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--organizer-border)] pb-3">
                <Code2 className="h-4 w-4 text-[var(--organizer-gold-deep)]" />
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">ARSENAL & STACK</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.length > 0 ? profile.skills.map((skill) => (
                  <span key={skill} className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-2.5 py-1 text-[11px] font-bold font-mono uppercase text-[var(--organizer-ink-primary)]" style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}>
                    {skill}
                  </span>
                )) : (
                  <span className="text-[10px] font-mono text-[var(--organizer-ink-muted)] uppercase">NO SKILLS LISTED YET</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Stats, Heatmap, Badges */}
          <motion.div variants={cardVariants} className="lg:col-span-8 space-y-8">
            
            {/* 4-Stat Highlight Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}>
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">GLOBAL RANK</div>
                <div className="mt-2 text-3xl font-black font-display text-[var(--organizer-ink-primary)]">{profile.rank === 0 ? "-" : `#${profile.rank}`}</div>
                <div className="mt-1 text-[10px] font-mono font-bold text-[var(--organizer-gold-deep)]">{profile.rank === 0 ? "UNRANKED" : "COMPETITOR"}</div>
              </div>

              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}>
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">TOTAL POINTS</div>
                <div className="mt-2 text-3xl font-black font-display text-[var(--organizer-ink-primary)]">{profile.points.toLocaleString()}</div>
                <div className="mt-1 text-[10px] font-mono font-bold text-[var(--organizer-ink-muted)]">+0 THIS SEASON</div>
              </div>

              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}>
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">VICTORIES</div>
                <div className="mt-2 text-3xl font-black font-display text-[var(--organizer-ink-primary)]">{profile.hackathonsWon}</div>
                <div className="mt-1 text-[10px] font-mono font-bold text-[var(--organizer-gold-deep)]">OF {profile.hackathonsAttended} PARTICIPATED</div>
              </div>

              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 transition-transform hover:-translate-y-1" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}>
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">DAY STREAK</div>
                <div className="mt-2 text-3xl font-black font-display text-[var(--organizer-ink-primary)] flex items-center gap-1">
                  <Flame className="h-6 w-6 text-[var(--organizer-gold-deep)] fill-[var(--organizer-gold)]" />
                  {profile.streakDays}d
                </div>
                <div className="mt-1 text-[10px] font-mono font-bold text-[var(--organizer-gold-deep)]">{profile.streakDays > 0 ? "ACTIVE BUILDER" : "START BUILDING"}</div>
              </div>
            </div>

            {/* 365-Day Contribution Heatmap */}
            <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-gold)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b-2 border-[var(--organizer-border)] pb-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="h-5 w-5 text-[var(--organizer-gold-deep)]" />
                  <h3 className="text-xl font-black font-display tracking-tight uppercase">365-DAY BUILD MATRIX</h3>
                </div>
              </div>
              <ContributionHeatmap userId={profile.id} empty />
            </div>

            {/* Badges & Achievements Grid */}
            <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 transition-transform hover:-translate-y-1" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}>
              <div className="flex items-center justify-between mb-6 border-b-2 border-[var(--organizer-border)] pb-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-[var(--organizer-gold-deep)]" />
                  <h3 className="text-xl font-black font-display tracking-tight uppercase">HONOR MEDALS & BADGES</h3>
                </div>
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-gold-deep)]">{profile.badges.length} UNLOCKED</span>
              </div>

              {profile.badges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.badges.map((badge) => (
                    <div key={badge.id} className="flex items-start gap-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-4 transition-transform hover:-translate-y-1 hover:-translate-x-1" style={{ boxShadow: badge.tier === "gold" ? "4px 4px 0px 0px var(--organizer-gold)" : "4px 4px 0px 0px var(--organizer-ink-primary)" }}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] text-2xl">{badge.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black font-mono uppercase tracking-tight text-[var(--organizer-ink-primary)] truncate">{badge.name}</h4>
                          <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 border border-[var(--organizer-ink-primary)] ${badge.tier === "gold" ? "bg-[var(--organizer-gold)] text-white" : "bg-[var(--organizer-surface)] text-[var(--organizer-ink-primary)]"}`}>{badge.tier}</span>
                        </div>
                        <p className="mt-1 text-[11px] font-mono text-[var(--organizer-ink-secondary)] line-clamp-2">{badge.description}</p>
                        <div className="mt-2 text-[9px] font-mono text-[var(--organizer-ink-muted)] uppercase">
                          UNLOCKED {new Date(badge.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="h-8 w-8 text-[var(--organizer-border)] mb-2" />
                  <p className="text-xs font-mono font-bold uppercase text-[var(--organizer-ink-muted)]">NO BADGES EARNED YET</p>
                  <p className="text-[10px] font-mono uppercase text-[var(--organizer-ink-muted)] mt-1">Join hackathons and submit projects to unlock honors.</p>
                </div>
              )}
            </div>

          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}