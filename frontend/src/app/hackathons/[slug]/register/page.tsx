"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ArrowRight, ShieldCheck, ChevronLeft, Github, Linkedin, Target, CheckCircle2, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function RegistrationFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const initializePage = async () => {
      try {
        // 1. Check Auth (If not logged in, boot them out)
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        
        if (!data.user) {
          router.replace(`/login?redirect=/hackathons/${slug}/register&role=participant`);
          return;
        }
        setUser(data.user);

        // 2. Fetch Event Data
        const { data: eventData, error: eventErr } = await supabase
          .from("hackathons")
          .select("*")
          .eq("slug", slug)
          .single();

        if (eventErr || !eventData) {
          router.replace("/hackathons");
          return;
        }
        setEvent(eventData);

        // 3. Fetch User Profile to pre-fill Github/LinkedIn
        const profileRes = await fetch(`/api/profile/${data.user.id}`, { cache: "no-store" });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.data) {
            if (profileData.data.github_url) setGithubUrl(profileData.data.github_url);
            if (profileData.data.linkedin_url) setLinkedinUrl(profileData.data.linkedin_url);
          }
        }

      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) initializePage();
  }, [slug, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrack) {
      setError("Please select a track to compete in.");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Optional: Update user's profile with provided github/linkedin links
      if (githubUrl || linkedinUrl) {
        await fetch(`/api/profile/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ github_url: githubUrl, linkedin_url: linkedinUrl }),
        });
      }

      // 2. Insert into event_registrations (Professional DB transaction)
      const { error: regError } = await supabase
        .from('event_registrations')
        .insert([{
          event_id: event.id,
          user_id: user.id,
          track: selectedTrack,
          status: 'registered'
        }]);

      // If they are already registered, Supabase might throw a unique constraint error
      // We catch it and push them to the workspace anyway
      if (regError && regError.code !== '23505') { 
        throw new Error(regError.message);
      }

      // 3. Redirect directly to the Workspace (Unstop flow)
      router.push(`/events/${event.id}`);

    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center font-mono font-bold uppercase animate-pulse text-[var(--organizer-ink-primary)]">Securing Secure Connection...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] font-body py-12">
      {/* Blueprint Grid Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `linear-gradient(to right, var(--organizer-border) 1px, transparent 1px), linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
        
        <Link href={`/hackathons/${slug}`} className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase mb-8 hover:text-[var(--organizer-gold-deep)] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Event Details
        </Link>

        {/* Header */}
        <div className="mb-8 border-b-2 border-[var(--organizer-ink-primary)] pb-6">
          <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
            SECURE ENROLLMENT PROTOCOL
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tighter uppercase leading-none">
            REGISTER FOR <span className="text-[var(--organizer-gold-deep)]">{event?.title}</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 border-2 border-red-600 bg-red-50 flex items-start gap-3" style={{ boxShadow: "4px 4px 0px 0px #dc2626" }}>
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-mono text-[10px] font-black uppercase text-red-700 mb-1">Registration Error</p>
              <p className="font-mono text-xs font-bold text-red-900">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:p-8" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}>
              
              {/* Operator Details (Locked) */}
              <div className="mb-8">
                <h3 className="font-display font-black text-xl uppercase mb-4 border-l-4 border-[var(--organizer-ink-primary)] pl-3">Operator Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)] mb-1.5 block">Full Name</label>
                    <div className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-border)] p-3 font-mono text-xs text-[var(--organizer-ink-secondary)] cursor-not-allowed">
                      {user?.name || "Unknown"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)] mb-1.5 block">Email Address</label>
                    <div className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-border)] p-3 font-mono text-xs text-[var(--organizer-ink-secondary)] cursor-not-allowed">
                      {user?.email || "Unknown"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Dossier (Editable) */}
              <div className="mb-8 border-t-2 border-[var(--organizer-border)] pt-8">
                <h3 className="font-display font-black text-xl uppercase mb-4 border-l-4 border-[var(--organizer-gold)] pl-3">Technical Dossier</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)] mb-1.5 block">GitHub Profile (Recommended)</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--organizer-ink-muted)]" />
                      <input 
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-3 pl-10 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-muted)] mb-1.5 block">LinkedIn Profile (Optional)</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--organizer-ink-muted)]" />
                      <input 
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-3 pl-10 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Track Selection */}
              <div className="mb-8 border-t-2 border-[var(--organizer-border)] pt-8">
                <h3 className="font-display font-black text-xl uppercase mb-4 border-l-4 border-[var(--organizer-ink-primary)] pl-3">Event Preferences</h3>
                <label className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-primary)] mb-3 block flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-[var(--organizer-gold-deep)]" /> Select your primary track *
                </label>
                <div className="space-y-3">
                  {event?.tracks?.map((track: string) => (
                    <label 
                      key={track} 
                      className={`flex items-center gap-3 p-4 border-2 cursor-pointer transition-colors ${selectedTrack === track ? 'border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)]' : 'border-[var(--organizer-border)] bg-[var(--organizer-bg)] hover:border-[var(--organizer-ink-primary)]'}`}
                    >
                      <div className={`w-4 h-4 border-2 flex items-center justify-center ${selectedTrack === track ? 'border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)]' : 'border-[var(--organizer-ink-muted)]'}`}>
                        {selectedTrack === track && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-mono text-xs font-black uppercase">{track}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[var(--organizer-ink-primary)] text-white font-mono font-black text-sm uppercase tracking-widest py-4 border-2 border-[var(--organizer-ink-primary)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--organizer-gold)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {isSubmitting ? "ENROLLING..." : "CONFIRM REGISTRATION"}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Right Sidebar - Event Summary */}
          <div className="md:col-span-1">
            <div className="sticky top-8 bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] p-6" style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}>
              <div className="text-[10px] font-mono font-bold uppercase text-[var(--organizer-ink-secondary)] mb-2">Event Summary</div>
              <h3 className="font-display font-black text-2xl uppercase tracking-tight text-[var(--organizer-ink-primary)] mb-4">{event?.title}</h3>
              
              <div className="space-y-3 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] border-t-2 border-[var(--organizer-border)] pt-4">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--organizer-border)]">
                  <span className="text-[var(--organizer-ink-muted)]">EDITION</span>
                  <span>{event?.edition}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[var(--organizer-border)]">
                  <span className="text-[var(--organizer-ink-muted)]">LOCATION</span>
                  <span>{event?.location}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[var(--organizer-border)]">
                  <span className="text-[var(--organizer-ink-muted)]">FEE</span>
                  <span className="text-emerald-600">FREE</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}