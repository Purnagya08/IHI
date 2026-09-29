"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Upload,
  Github,
  Globe,
  Clock,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
  Send,
  Zap,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const floatOne: Variants = {
  animate: {
    y: [0, -12, 0],
    rotate: [10, 16, 4, 10],
    transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
  },
};

interface FormState {
  title: string;
  tagline: string;
  description: string;
  repoUrl: string;
  demoUrl: string;
}

const EMPTY: FormState = {
  title: "",
  tagline: "",
  description: "",
  repoUrl: "",
  demoUrl: "",
};

export default function SubmitPage() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [remaining, setRemaining] = useState({ d: 4, h: 15, m: 22, s: 0 });

  // Eligibility gate
  const [gateLoading, setGateLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [inTeam, setInTeam] = useState(false);
  const [primaryEventId, setPrimaryEventId] = useState<string | null>(null);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          setCanSubmit(false);
          return;
        }
        const me = await meRes.json();
        const userId = me.user?.id || me.user?.sub;
        if (!userId) {
          setCanSubmit(false);
          return;
        }

        const eligRes = await fetch(
          `/api/participant/eligibility?userId=${encodeURIComponent(userId)}`,
          { cache: "no-store" }
        );
        if (eligRes.ok) {
          const elig = await eligRes.json();
          setRegistered(!!elig.registered);
          setInTeam(!!elig.inTeam);
          setCanSubmit(!!elig.canSubmit);
          setPrimaryEventId(elig.primaryEventId || null);
        }
      } catch (e) {
        console.error(e);
        setCanSubmit(false);
      } finally {
        setGateLoading(false);
      }
    }
    checkEligibility();
  }, []);

  useEffect(() => {
    const end = Date.now() + ((4 * 24 + 15) * 60 + 22) * 60 * 1000;
    const t = setInterval(() => {
      const diff = Math.max(0, end - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining({ d, h, m, s });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadDraft = useCallback(async () => {
    if (!canSubmit) return;
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) return;
      const me = await meRes.json();
      const userId = me.user?.id || me.user?.sub;
      if (!userId) return;

      const { data } = await supabase
        .from("submissions")
        .select("title, description, repo_url, demo_url, fields, status")
        .eq("submitted_by", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setForm({
          title: data.title || data.fields?.title || "",
          tagline: data.fields?.tagline || "",
          description: data.description || data.fields?.description || "",
          repoUrl: data.repo_url || data.fields?.repo_url || "",
          demoUrl: data.demo_url || data.fields?.demo_url || "",
        });
        if (data.status === "final" || data.status === "locked") setLocked(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [supabase, canSubmit]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveDraft = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, finalize: false, eventId: primaryEventId }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage({ type: "ok", text: "Draft saved to database." });
    } catch {
      setMessage({ type: "err", text: "Could not save draft. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!canSubmit) return;
    if (!form.title.trim() || !form.repoUrl.trim()) {
      setMessage({ type: "err", text: "Project title and repository URL are required." });
      return;
    }
    setFinalizing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, finalize: true, eventId: primaryEventId }),
      });
      if (!res.ok) throw new Error("Finalize failed");
      setLocked(true);
      setMessage({
        type: "ok",
        text: "Submission finalized & locked. AI Judge Briefing will run on evaluation.",
      });
    } catch {
      setMessage({ type: "err", text: "Finalize failed. Please try again." });
    } finally {
      setFinalizing(false);
    }
  };

  const fieldClass =
    "w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-3 text-xs font-mono font-bold uppercase placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)] disabled:opacity-60";

  const teamHref = primaryEventId
    ? `/events/${primaryEventId}/team`
    : "/team";

  // ── GATE: not eligible ──────────────────────────────────────
  if (!gateLoading && !canSubmit) {
    return (
      <div className="relative min-h-screen bg-[var(--organizer-bg)] pb-24 text-[var(--organizer-ink-primary)]">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-80"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--organizer-border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--organizer-border) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-20">
          <div
            className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-8 text-center"
            style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)]">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight">
              Submission Gate Locked
            </h1>
            <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              Unstop-style protocol: you must register for an event and join a team before submitting.
            </p>

            <div className="mt-8 space-y-3 text-left">
              <GateRow
                done={registered}
                step="1"
                title="Register for a hackathon"
                href="/hackathons"
                cta="OPEN ARENA"
              />
              <GateRow
                done={inTeam}
                step="2"
                title="Create or join a team"
                href={registered ? teamHref : "/hackathons"}
                cta={registered ? "TEAM BOARD" : "REGISTER FIRST"}
              />
              <GateRow
                done={false}
                step="3"
                title="Submit project"
                href="#"
                cta="LOCKED"
                locked
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gateLoading) {
    return (
      <div className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center font-mono text-xs font-bold uppercase tracking-widest">
        Verifying submission clearance…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--organizer-bg)] pb-24 text-[var(--organizer-ink-primary)] selection:bg-[var(--organizer-gold)] selection:text-white">
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
        variants={floatOne}
        animate="animate"
        className="pointer-events-none absolute right-12 top-20 z-10 hidden h-16 w-16 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] shadow-[6px_6px_0px_0px_var(--organizer-ink-primary)] lg:flex"
      >
        <Upload className="h-8 w-8 text-white" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 border-b-2 border-[var(--organizer-ink-primary)] pb-6">
          <div className="mb-3 inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
            Final Handoff Protocol
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-5xl font-black font-display uppercase tracking-tighter md:text-6xl">
                Submit <span className="text-[var(--organizer-gold-deep)]">Project.</span>
              </h1>
              <p className="mt-2 text-xs font-mono uppercase tracking-wide text-[var(--organizer-ink-muted)]">
                Clearance verified — registered & teamed. Once finalized, your entry is locked.
              </p>
            </div>
            <div
              className={`border-2 border-[var(--organizer-ink-primary)] px-3 py-1.5 text-[10px] font-bold font-mono uppercase ${
                locked
                  ? "bg-[var(--organizer-ink-primary)] text-white"
                  : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {locked ? (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              ) : (
                "Submissions Open"
              )}
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] p-3 text-xs font-mono font-bold ${
              message.type === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className="lg:col-span-8 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6"
            style={{ boxShadow: "8px 8px 0px 0px var(--organizer-gold)" }}
          >
            <div className="mb-6 flex items-center justify-between border-b-2 border-[var(--organizer-border)] pb-3">
              <div>
                <h2 className="text-xl font-black font-display uppercase">Project Details</h2>
                <p className="text-[10px] font-mono text-[var(--organizer-ink-muted)]">
                  Give judges the links and context they need.
                </p>
              </div>
              <span className="text-[10px] font-bold font-mono uppercase text-[var(--organizer-gold-deep)]">
                Saves to database
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  Project Title *
                </label>
                <input
                  disabled={locked}
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="E.G. SIGNAL FOUNDRY"
                  className={fieldClass}
                  style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  One-line Tagline
                </label>
                <input
                  disabled={locked}
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  placeholder="WHAT DOES YOUR PROJECT MAKE POSSIBLE?"
                  className={fieldClass}
                  style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                  Project Description
                </label>
                <textarea
                  disabled={locked}
                  rows={5}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="EXPLAIN THE PROBLEM, YOUR APPROACH, AND WHAT IS READY TO DEMO."
                  className={fieldClass + " normal-case"}
                  style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                    <Github className="h-3.5 w-3.5" /> Repository URL *
                  </label>
                  <input
                    disabled={locked}
                    value={form.repoUrl}
                    onChange={(e) => update("repoUrl", e.target.value)}
                    placeholder="HTTPS://GITHUB.COM/YOUR-TEAM/PROJECT"
                    className={fieldClass}
                    style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                    <Globe className="h-3.5 w-3.5" /> Demo URL
                  </label>
                  <input
                    disabled={locked}
                    value={form.demoUrl}
                    onChange={(e) => update("demoUrl", e.target.value)}
                    placeholder="HTTPS://YOUR-PROJECT.EXAMPLE.COM"
                    className={fieldClass}
                    style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
                  />
                </div>
              </div>

              {!locked && (
                <div className="flex flex-wrap justify-end gap-3 border-t-2 border-[var(--organizer-border)] pt-5">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-5 py-2.5 text-xs font-bold font-mono uppercase transition-transform hover:-translate-y-1 disabled:opacity-50"
                    style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={finalize}
                    disabled={finalizing}
                    className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-5 py-2.5 text-xs font-bold font-mono uppercase transition-transform hover:-translate-y-1 disabled:opacity-50"
                    style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
                  >
                    <Send className="h-4 w-4" />
                    {finalizing ? "Locking…" : "Finalize & Submit"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-5"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
            >
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                <Clock className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                Time Remaining
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: remaining.d, l: "Days" },
                  { v: remaining.h, l: "Hrs" },
                  { v: remaining.m, l: "Min" },
                  { v: remaining.s, l: "Sec" },
                ].map((c) => (
                  <div
                    key={c.l}
                    className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] py-3 text-center"
                  >
                    <div className="text-xl font-black font-display tabular-nums">
                      {String(c.v).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] font-bold font-mono uppercase text-[var(--organizer-ink-muted)]">
                      {c.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-5"
              style={{ boxShadow: "6px 6px 0px 0px var(--organizer-gold)" }}
            >
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                <Users className="h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />
                Clearance
              </div>
              <ul className="space-y-2 font-mono text-[10px] font-bold uppercase">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Event registered
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Team membership verified
                </li>
              </ul>
            </div>

            <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] p-4 text-[10px] font-mono uppercase leading-relaxed">
              <Zap className="mb-1 inline h-3.5 w-3.5 text-[var(--organizer-gold-deep)]" />{" "}
              Finalizing arms the <strong>AI Judge Briefing</strong> pipeline for your repo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GateRow({
  done,
  step,
  title,
  href,
  cta,
  locked,
}: {
  done: boolean;
  step: string;
  title: string;
  href: string;
  cta: string;
  locked?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-2 p-4 ${
        done
          ? "border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)]"
          : "border-[var(--organizer-border)] bg-[var(--organizer-bg)]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] font-mono text-xs font-black">
          {done ? <CheckCircle2 className="h-4 w-4" /> : step}
        </div>
        <span className="font-mono text-xs font-bold uppercase truncate">{title}</span>
      </div>
      {locked ? (
        <span className="font-mono text-[9px] font-black uppercase text-[var(--organizer-ink-muted)] flex items-center gap-1">
          <Lock className="h-3 w-3" /> {cta}
        </span>
      ) : (
        <Link
          href={href}
          className="shrink-0 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] px-3 py-1.5 font-mono text-[9px] font-black uppercase text-white hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)]"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}