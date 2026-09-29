"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";
import { 
  Calendar, MapPin, Users, Award, Clock, ArrowRight, 
  Share2, Shield, ChevronRight, Target, Zap, CheckCircle2, Lock
} from "lucide-react";
import Link from "next/link";
import { getAuthSession, type UserProfile } from "@/lib/auth";

interface Hackathon {
  id: string;
  slug: string;
  title: string;
  edition: string;
  status: string;
  tagline: string;
  start_date: string;
  location: string;
  registrants: number;
  prize_pool: string;
  tracks: string[];
  logo_background: string;
}

export default function PublicEventPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<Hackathon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "prizes">("details");

  // Auth & Registration State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. Check user session
    const session = getAuthSession();
    if (session && session.name) {
      setUser(session);
    }
    setAuthChecked(true);

    // 2. Fetch event data
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .eq("slug", slug)
        .single();

      if (data) setEvent(data);
      setIsLoading(false);
    };
    
    if (slug) fetchEvent();
  }, [slug, supabase]);

  // Registration Handler
  const handleRegister = async () => {
    // If not logged in, redirect to login with a return URL
    if (!user) {
      const returnUrl = encodeURIComponent(`/hackathons/${slug}`);
      router.push(`/login?redirect=${returnUrl}&role=participant`);
      return;
    }

    // If logged in, process registration
    setIsRegistering(true);
    try {
      // TODO: Replace with real Supabase insert to 'registrations' table
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      alert(`Successfully registered for ${event?.title}!`);
      
      // Optimistically update registrants count on the screen
      if (event) {
        setEvent({ ...event, registrants: event.registrants + 1 });
      }
    } catch (err) {
      alert("Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading || !authChecked) {
    return <div className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center font-mono font-bold uppercase animate-pulse text-[var(--organizer-ink-primary)]">Loading Workspace...</div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--organizer-bg)] flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black font-display uppercase text-[var(--organizer-ink-primary)]">404 - Event Not Found</h1>
        <button onClick={() => router.push("/hackathons")} className="mt-4 border-2 border-[var(--organizer-ink-primary)] px-6 py-2 font-mono font-bold hover:bg-[var(--organizer-gold)] transition-colors">Return to Arena</button>
      </div>
    );
  }

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-6">
          <Link href="/hackathons" className="hover:text-[var(--organizer-ink-primary)] transition-colors">Hackathons</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--organizer-ink-primary)]">{event.title}</span>
        </div>

        {/* Hero Banner (Unstop Style but IHI Brand) */}
        <div className="w-full bg-[var(--organizer-ink-primary)] border-2 border-[var(--organizer-ink-primary)] h-48 md:h-72 relative overflow-hidden flex items-center justify-center" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, var(--organizer-gold) 1px, transparent 0)`, backgroundSize: "24px 24px" }} />
          <h1 className="text-6xl md:text-9xl font-black font-display text-white opacity-10 tracking-tighter uppercase absolute select-none text-center leading-none">{event.title}</h1>
          <div className="z-10 text-center px-4">
            <div className="inline-flex items-center justify-center px-4 py-1.5 bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] font-mono text-xs font-black uppercase tracking-widest border-2 border-[var(--organizer-ink-primary)] mb-4 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
              {event.status === 'live' ? '🔴 LIVE NOW' : 'UPCOMING EVENT'}
            </div>
            <h2 className="text-4xl md:text-6xl font-black font-display text-white uppercase tracking-tight">{event.title} <span className="text-[var(--organizer-gold)]">{event.edition}</span></h2>
          </div>
        </div>

        {/* Two Column Layout (Content Left, Sticky Card Right) */}
        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: MAIN CONTENT */}
          <div className="flex-1 space-y-8">
            
            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-4 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
               <div className="flex items-center gap-2 pr-4 border-r-2 border-[var(--organizer-border)]">
                 <MapPin className="w-4 h-4 text-[var(--organizer-gold-deep)]" />
                 <span className="font-mono text-xs font-bold uppercase">{event.location}</span>
               </div>
               <div className="flex items-center gap-2 pr-4 border-r-2 border-[var(--organizer-border)]">
                 <Users className="w-4 h-4 text-[var(--organizer-gold-deep)]" />
                 <span className="font-mono text-xs font-bold uppercase">Team Size: 1-4</span>
               </div>
               <div className="flex items-center gap-2">
                 <Award className="w-4 h-4 text-[var(--organizer-gold-deep)]" />
                 <span className="font-mono text-xs font-bold uppercase text-[var(--organizer-gold-deep)]">Prizes: {event.prize_pool}</span>
               </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex gap-2 border-b-2 border-[var(--organizer-ink-primary)] pb-0 overflow-x-auto hide-scrollbar">
              {(["details", "timeline", "prizes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-mono text-xs font-black uppercase tracking-widest border-2 border-b-0 transition-colors whitespace-nowrap ${
                    activeTab === tab 
                      ? "bg-[var(--organizer-ink-primary)] text-white border-[var(--organizer-ink-primary)]" 
                      : "bg-[var(--organizer-surface)] text-[var(--organizer-ink-muted)] border-[var(--organizer-border)] hover:bg-[var(--organizer-gold-light)] hover:text-[var(--organizer-ink-primary)] hover:border-[var(--organizer-ink-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 md:p-8 shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)]">
              
              {/* DETAILS TAB */}
              {activeTab === "details" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-black font-display uppercase tracking-tight mb-4 flex items-center gap-2 border-l-4 border-[var(--organizer-gold)] pl-3">
                      All you need to know about {event.title}
                    </h3>
                    <p className="text-sm font-mono font-bold text-[var(--organizer-ink-secondary)] leading-relaxed mb-6 bg-[var(--organizer-bg)] p-4 border border-[var(--organizer-border)]">
                      {event.tagline}
                    </p>
                    
                    <h4 className="font-bold font-mono text-sm uppercase mb-3 text-[var(--organizer-ink-primary)]">Why Participate?</h4>
                    <ul className="space-y-3 font-mono text-xs font-bold text-[var(--organizer-ink-muted)]">
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--organizer-gold-deep)] flex-shrink-0" /> Build technology that tackles real-world engineering problems.</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--organizer-gold-deep)] flex-shrink-0" /> Turn a real problem into a working prototype with potential for real-world impact.</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--organizer-gold-deep)] flex-shrink-0" /> Compete for a massive prize pool of {event.prize_pool}.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold font-mono text-sm uppercase mb-3 text-[var(--organizer-ink-primary)] mt-8">Tracks Available</h4>
                    <div className="flex flex-wrap gap-2">
                      {event.tracks.map((track) => (
                        <span key={track} className="px-3 py-1.5 bg-[var(--organizer-gold-light)] border border-[var(--organizer-ink-primary)] font-mono text-[10px] font-black uppercase text-[var(--organizer-ink-primary)]">
                          {track}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === "timeline" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight mb-8 flex items-center gap-2 border-l-4 border-[var(--organizer-gold)] pl-3">
                    Dates & Deadlines
                  </h3>
                  <div className="relative border-l-2 border-[var(--organizer-ink-primary)] ml-4 space-y-8 pb-4">
                    
                    <div className="relative pl-8">
                      <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[var(--organizer-gold)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center"><Zap className="w-3 h-3 text-[var(--organizer-ink-primary)]" /></div>
                      <div className="font-mono text-xs font-bold uppercase text-[var(--organizer-ink-muted)]">Registration Opens</div>
                      <div className="font-display font-black text-xl text-[var(--organizer-ink-primary)]">Immediately</div>
                    </div>
                    
                    <div className="relative pl-8">
                      <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] rounded-full" />
                      <div className="font-mono text-xs font-bold uppercase text-[var(--organizer-ink-muted)]">Hackathon Begins</div>
                      <div className="font-display font-black text-xl text-[var(--organizer-ink-primary)]">{event.start_date.split('-')[0] || event.start_date}</div>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[var(--organizer-ink-primary)] border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center"><Target className="w-3 h-3 text-white" /></div>
                      <div className="font-mono text-xs font-bold uppercase text-[var(--organizer-ink-muted)]">Submission Deadline</div>
                      <div className="font-display font-black text-xl text-[var(--organizer-ink-primary)]">End of Event</div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* PRIZES TAB */}
              {activeTab === "prizes" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight mb-6 flex items-center gap-2 border-l-4 border-[var(--organizer-gold)] pl-3">
                    Rewards and Prizes
                  </h3>
                  <p className="font-mono text-xs font-bold text-[var(--organizer-ink-muted)] mb-8">All participants receive a certificate, while the top performers share a {event.prize_pool} prize pool.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] p-6 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
                      <h4 className="font-display font-black text-2xl uppercase mb-1">Grand Winner</h4>
                      <div className="font-mono font-black text-3xl text-[var(--organizer-gold-deep)] my-4">{event.prize_pool}</div>
                      <p className="font-mono text-[10px] font-bold uppercase text-[var(--organizer-ink-secondary)]">+ Certificate of Excellence</p>
                    </div>
                    <div className="bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-6">
                      <h4 className="font-display font-black text-2xl uppercase mb-1 text-[var(--organizer-ink-muted)]">Runner Ups</h4>
                      <div className="font-mono font-black text-xl text-[var(--organizer-ink-primary)] my-4">Track Specific Prizes</div>
                      <p className="font-mono text-[10px] font-bold uppercase text-[var(--organizer-ink-secondary)]">+ Merit Certificates</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* RIGHT: STICKY ACTION CARD */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              
              {/* Registration Card */}
              <div className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-6 shadow-[8px_8px_0px_0px_var(--organizer-ink-primary)]">
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[var(--organizer-border)]">
                  <div>
                    <span className="block font-mono text-[10px] font-bold uppercase text-[var(--organizer-ink-muted)]">Status</span>
                    <span className="font-display font-black text-xl text-emerald-600 uppercase">Registration Open</span>
                  </div>
                  <Shield className="w-8 h-8 text-[var(--organizer-gold)]" />
                </div>

                {/* Conditional Auth State inside the Card */}
                {user ? (
                  <div className="mb-6 p-3 border-2 border-[var(--organizer-border)] bg-[var(--organizer-bg)] flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--organizer-ink-primary)] rounded-full flex items-center justify-center text-white font-bold font-mono uppercase">
                      {user.name?.charAt(0) || "H"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold font-mono text-xs uppercase text-[var(--organizer-ink-primary)] truncate">
                        Logged in as {user.name}
                      </div>
                      <div className="font-mono text-[9px] text-[var(--organizer-ink-muted)] truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-3 border-2 border-dashed border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] flex items-start gap-3">
                    <Lock className="w-4 h-4 text-[var(--organizer-gold-deep)] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold font-mono text-xs uppercase text-[var(--organizer-ink-primary)]">
                        Login Required
                      </div>
                      <div className="font-mono text-[9px] text-[var(--organizer-ink-secondary)] mt-0.5">
                        Sign in as a participant to register for this event.
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full bg-[var(--organizer-gold)] border-2 border-[var(--organizer-ink-primary)] text-[var(--organizer-ink-primary)] font-mono font-black text-sm uppercase tracking-widest py-4 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)] transition-all mb-4 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isRegistering ? (
                    "PROCESSING..."
                  ) : user ? (
                    <>
                      REGISTER NOW
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      LOGIN TO REGISTER
                    </>
                  )}
                </button>

                {/* Show Signup Link if not logged in */}
                {!user && (
                  <p className="text-center font-mono text-[9px] font-bold uppercase text-[var(--organizer-ink-muted)] mb-4">
                    No account?{" "}
                    <Link
                      href={`/signup?redirect=${encodeURIComponent(`/hackathons/${slug}`)}&role=participant`}
                      className="text-[var(--organizer-gold-deep)] underline hover:no-underline"
                    >
                      Create one free
                    </Link>
                  </p>
                )}

                <div className="flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase text-[var(--organizer-ink-secondary)]">
                  <Users className="w-3.5 h-3.5" />
                  <span>{event.registrants} Registered Builders</span>
                </div>
              </div>

              {/* Share Card */}
              <div className="bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-4 flex items-center justify-between">
                <span className="font-display font-black text-sm uppercase">Share with friends</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Event link copied to clipboard!");
                  }}
                  className="flex items-center gap-2 bg-[var(--organizer-ink-primary)] text-white px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3 h-3" /> Copy Link
                </button>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}