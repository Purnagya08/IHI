"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AlertCircle, ArrowRight, CheckCircle2, X, Plus, Terminal, Zap } from "lucide-react";

export default function NewEventWizard() {
  const router = useRouter();
  
  // --- WIZARD STATE ---
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- FORM STATE (Starts Empty for Production) ---
  const [title, setTitle] = useState("");
  const [edition, setEdition] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [prizePool, setPrizePool] = useState("");
  
  const [tracks, setTracks] = useState<string[]>([]);
  const [newTrack, setNewTrack] = useState("");
  
  const [iconName, setIconName] = useState("zap");
  const [logoBackground, setLogoBackground] = useState("#F5F5F0");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Auto-generate slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"));
  };

  const handleNext = () => {
    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const addTrack = () => {
    if (newTrack.trim() && !tracks.includes(newTrack.trim().toUpperCase())) {
      setTracks([...tracks, newTrack.trim().toUpperCase()]);
      setNewTrack("");
    }
  };

  const removeTrack = (trackToRemove: string) => {
    setTracks(tracks.filter((t) => t !== trackToRemove));
  };

  // --- PUBLISH TO SUPABASE ---
  const handlePublish = async () => {
    if (!title || !slug || !tagline || !startDate || !location) {
      setErrorMessage("Please fill in all required fields before publishing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from("hackathons").insert({
        title,
        edition,
        slug,
        tagline,
        start_date: startDate,
        location,
        prize_pool: prizePool || "TBA",
        tracks: tracks.length > 0 ? tracks : ["GENERAL"],
        icon_name: iconName,
        logo_background: logoBackground,
        status: "upcoming",
        registrants: 0,
      });

      if (error) throw error;

      alert("Event Published Live to the Arena!");
      router.push("/hackathons"); // Redirect to public page to see it live
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to publish event to database.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white pb-24 font-body">
      
      {/* Blueprint Grid Background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--organizer-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-12 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="mb-12 border-b-2 border-[var(--organizer-ink-primary)] pb-8 bg-[var(--organizer-bg)]">
          <div className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-primary)] mb-4">
            <Terminal className="h-3.5 w-3.5" />
            ORGANIZER DASHBOARD
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tighter uppercase leading-none">
            INITIALIZE <span className="text-[var(--organizer-gold-deep)]">EVENT.</span>
          </h1>

          {/* STEPPER */}
          <div className="mt-8 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`h-3 flex-1 border-2 border-[var(--organizer-ink-primary)] transition-colors ${
                  step >= i ? "bg-[var(--organizer-gold)]" : "bg-[var(--organizer-surface)]"
                }`} 
              />
            ))}
          </div>
          
          <div className="mt-3 flex justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            <span>1. IDENTITY</span>
            <span>2. LOGISTICS</span>
            <span>3. BRANDING</span>
            <span>4. DEPLOY</span>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 border-2 border-[var(--organizer-ink-primary)] bg-red-50 p-4 shadow-[4px_4px_0px_0px_var(--organizer-ink-primary)]">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-bold font-mono text-red-900">{errorMessage}</p>
          </div>
        )}

        {/* MAIN FORM CARD */}
        <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:p-10" style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}>
          
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black font-display uppercase tracking-tight">Core Identity</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. UEM TECHFEST"
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Edition / Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 or V2.0"
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">URL Slug *</label>
                <div className="flex items-center">
                  <span className="border-2 border-r-0 border-[var(--organizer-ink-primary)] bg-[var(--organizer-border)] px-4 py-3 text-sm font-mono font-bold text-[var(--organizer-ink-muted)]">ihi.com/hackathons/</span>
                  <input
                    type="text"
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Punchy Tagline *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Building the future of AI and Web3 at UEM Jaipur."
                  className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: LOGISTICS */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black font-display uppercase tracking-tight">Time & Space</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Date Range *</label>
                  <input
                    type="text"
                    placeholder="e.g. NOV 10-12, 2026"
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-mono text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. UEM JAIPUR, RAJASTHAN"
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-mono text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Prize Pool</label>
                <input
                  type="text"
                  placeholder="e.g. ₹50,000 or $10,000"
                  className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-display text-lg font-black focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: BRANDING & TRACKS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black font-display uppercase tracking-tight">Tracks & Theme</h2>
              
              <div>
                <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Hackathon Tracks</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. AI AGENTS"
                    className="flex-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-mono text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTrack()}
                  />
                  <button
                    type="button"
                    onClick={addTrack}
                    className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-4 py-3 text-white transition-transform hover:-translate-y-1"
                    style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {tracks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 p-4 border-2 border-[var(--organizer-border)] bg-[var(--organizer-bg)]">
                    {tracks.map((track) => (
                      <div key={track} className="flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-3 py-1">
                        <span className="text-[10px] font-mono font-bold">{track}</span>
                        <button type="button" onClick={() => removeTrack(track)} className="text-red-500 hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Theme Color (Hex)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={logoBackground}
                      onChange={(e) => setLogoBackground(e.target.value)}
                      className="h-12 w-12 cursor-pointer border-2 border-[var(--organizer-ink-primary)] p-0.5"
                    />
                    <input
                      type="text"
                      value={logoBackground}
                      onChange={(e) => setLogoBackground(e.target.value)}
                      className="flex-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 font-mono text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-secondary)]">Main Icon</label>
                  <select
                    className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-4 py-3 font-mono text-sm font-bold uppercase focus:outline-none"
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                  >
                    <option value="zap">Lightning (Zap)</option>
                    <option value="cpu">Processor (CPU)</option>
                    <option value="code">Brackets (Code)</option>
                    <option value="globe">World (Globe)</option>
                    <option value="layers">Stack (Layers)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black font-display uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-[var(--organizer-gold)]" />
                Ready to Deploy
              </h2>
              
              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-6 space-y-6">
                <div className="flex items-center gap-4 border-b-2 border-[var(--organizer-border)] pb-4">
                  <div className="h-12 w-12 border-2 border-[var(--organizer-ink-primary)] flex items-center justify-center" style={{ backgroundColor: logoBackground }}>
                    {/* Render visual icon preview roughly */}
                    <Terminal className="h-6 w-6 text-[var(--organizer-ink-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display leading-none">{title} <span className="text-[var(--organizer-gold-deep)]">{edition}</span></h3>
                    <p className="font-mono text-[10px] font-bold text-[var(--organizer-ink-muted)] mt-1">/hackathons/{slug}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs font-bold">
                  <div>
                    <span className="block text-[9px] text-[var(--organizer-ink-muted)] mb-1">TIMELINE</span>
                    {startDate || "TBA"}
                  </div>
                  <div>
                    <span className="block text-[9px] text-[var(--organizer-ink-muted)] mb-1">LOCATION</span>
                    {location || "TBA"}
                  </div>
                  <div>
                    <span className="block text-[9px] text-[var(--organizer-ink-muted)] mb-1">PRIZE POOL</span>
                    <span className="text-[var(--organizer-gold-deep)]">{prizePool || "TBA"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[var(--organizer-ink-muted)] mb-1">TRACKS</span>
                    {tracks.length > 0 ? tracks.join(", ") : "GENERAL"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION CONTROLS */}
          <div className="mt-10 flex items-center justify-between border-t-2 border-[var(--organizer-border)] pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
              className="border-2 border-[var(--organizer-border)] bg-[var(--organizer-bg)] px-6 py-3 text-xs font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-muted)] hover:border-[var(--organizer-ink-primary)] hover:text-[var(--organizer-ink-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              BACK
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-6 py-3 text-xs font-bold font-mono uppercase tracking-wider text-white transition-transform hover:-translate-x-1 hover:-translate-y-1"
                style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
              >
                NEXT STAGE
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-8 py-4 text-sm font-bold font-mono uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-50"
                style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
              >
                {isSubmitting ? "DEPLOYING TO SUPABASE..." : "LAUNCH HACKATHON LIVE"}
                <Zap className="h-4 w-4" />
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}