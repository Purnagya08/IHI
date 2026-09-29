"use client";

import React, { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Gavel, Mail, Zap, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function JudgeLoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    errorParam ? { type: "error", text: "Session expired or invalid. Authenticate below." } : null
  );

  const handleDirectAccess = () => {
    if (!email) {
      setStatusMsg({ type: "error", text: "Please enter a valid judge email address." });
      return;
    }
    setLoading(true);
    // Direct window navigation forces the browser to hit GET /api/auth/judge-direct
    // which sets valid JWT cookies and redirects straight to /judge/queue
    window.location.href = `/api/auth/judge-direct?email=${encodeURIComponent(
      email
    )}&eventId=${encodeURIComponent(eventId)}`;
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 border-2 p-4 flex items-start gap-3 ${
            statusMsg.type === "error"
              ? "bg-red-50 border-red-600 text-red-900 shadow-[4px_4px_0px_0px_#DC2626]"
              : "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-[4px_4px_0px_0px_#059669]"
          }`}
        >
          {statusMsg.type === "error" ? (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-mono font-bold uppercase tracking-wide">
            {statusMsg.text}
          </div>
        </motion.div>
      )}

      <div
        className="bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] p-8"
        style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}
      >
        <div className="text-center mb-6">
          <div
            className="inline-block bg-[var(--organizer-gold-light)] border-2 border-[var(--organizer-ink-primary)] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--organizer-ink-primary)] mb-3"
            style={{ boxShadow: "2px 2px 0px 0px var(--organizer-ink-primary)" }}
          >
            EVALUATION ACCESS
          </div>
          <h1 className="text-4xl font-black font-display tracking-tighter uppercase mb-2">
            JUDGE <span className="text-[var(--organizer-gold-deep)]">PORTAL.</span>
          </h1>
          <p className="text-[11px] font-mono font-bold uppercase tracking-wide text-[var(--organizer-ink-muted)]">
            ENTER YOUR EMAIL AND EVENT NODE TO AUTHORIZE ACCESS.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-2 block">
              JUDGE EMAIL ADDRESS
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-3 pl-10 font-mono text-xs uppercase font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_var(--organizer-gold)] transition-all"
                placeholder="JUDGE@UNIVERSITY.EDU"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--organizer-ink-muted)]" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-2 block">
              EVENT ID (NODE)
            </label>
            <input
              type="text"
              required
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-[var(--organizer-bg)] border-2 border-[var(--organizer-ink-primary)] p-3 font-mono text-xs uppercase font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_var(--organizer-gold)] transition-all"
              placeholder="event-id"
            />
          </div>

          <button
            type="button"
            onClick={handleDirectAccess}
            disabled={loading}
            className="w-full bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] font-mono text-xs font-black uppercase tracking-widest p-3.5 border-2 border-[var(--organizer-ink-primary)] hover:bg-[var(--organizer-gold-deep)] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
          >
            <Zap className="w-4 h-4 fill-current" />
            {loading ? "AUTHORIZING..." : "ENTER DIRECTLY →"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-[var(--organizer-border-light)] text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] hover:text-[var(--organizer-ink-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JudgeLoginPage() {
  return (
    <div className="min-h-screen bg-[var(--organizer-bg)] relative overflow-hidden flex items-center justify-center p-4">
      {/* Blueprint Graph Paper Background */}
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

      {/* Floating Shapes */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-[15%] w-20 h-20 bg-[var(--organizer-gold)] border-2 border-[var(--organizer-ink-primary)] z-0 hidden lg:flex items-center justify-center"
        style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
      >
        <Gavel className="w-8 h-8 text-[var(--organizer-ink-primary)]" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-24 left-[15%] w-28 h-28 rounded-full bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)] z-0 hidden lg:flex items-center justify-center"
        style={{ boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)" }}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--organizer-gold-deep)]" />
      </motion.div>

      <Suspense fallback={<div className="font-mono text-sm uppercase">INITIALIZING...</div>}>
        <JudgeLoginForm />
      </Suspense>
    </div>
  );
}