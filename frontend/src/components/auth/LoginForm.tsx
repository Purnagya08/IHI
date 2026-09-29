"use client";

import React, { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Cpu, Shield } from "lucide-react";
import { setAuthSession } from "@/lib/auth";
import { getCleanAuthErrorMessage } from "@/lib/auth/errors";

type Role = "participant" | "organizer" | "judge";

export function LoginForm({ defaultEventId = "" }: { defaultEventId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const urlError = search.get("error");

  const initialRole = (search.get("role") as Role) || "participant";

  const [role, setRole] = useState<Role>(
    ["participant", "organizer", "judge"].includes(initialRole)
      ? initialRole
      : "participant"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eventId, setEventId] = useState(defaultEventId || search.get("eventId") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "FORBIDDEN"
      ? "Access denied for this user role."
      : urlError
        ? "Authentication error. Please sign in again."
        : null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === "judge") {
        if (!email.trim()) throw new Error("Please enter your email.");
        if (!eventId.trim()) throw new Error("Event ID is required for judge access.");

        const res = await fetch("/api/auth/judge-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), eventId: eventId.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Judge login failed.");

        window.location.replace(`/judge/queue?eventId=${encodeURIComponent(eventId.trim())}`);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid email or password.");

      const activeRole = (data.user?.role || role) as Role;

      setAuthSession(
        {
          name: data.user?.name || email.trim().split("@")[0],
          email: data.user?.email || email.trim(),
          eventName: data.user?.eventName || "IHI Console",
          role: activeRole,
        },
        data.token
      );

      if (activeRole === "organizer" || role === "organizer") {
        window.location.replace("/dashboard/events");
        return;
      }

      const next = search.get("next") || search.get("redirect");
      if (
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.includes("ashish01234") &&
        !next.startsWith("/dashboard") &&
        !next.startsWith("/judge") &&
        !next.startsWith("/login")
      ) {
        window.location.replace(next);
        return;
      }

      // Unstop-style: participants land on PROFILE first
      window.location.replace("/profile");
    } catch (err) {
      setError(getCleanAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {error && (
        <div
          className="mb-6 border-2 border-red-600 bg-red-50 p-4 flex items-start gap-3"
          style={{ boxShadow: "4px 4px 0px 0px #dc2626" }}
        >
          <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-widest text-red-700 mb-0.5">
              Authentication Error
            </div>
            <div className="font-mono text-xs font-bold text-red-900">{error}</div>
          </div>
        </div>
      )}

      <div
        className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:p-8"
        style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}
      >
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black font-display uppercase tracking-tight text-[var(--organizer-ink-primary)] leading-none">
            SYSTEM <span className="text-[var(--organizer-gold-deep)]">ACCESS.</span>
          </h1>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            SELECT YOUR ROLE CLEARANCE AND AUTHENTICATE TO PROCEED.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-0 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-1 mb-6">
          {(["participant", "organizer", "judge"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setError(null);
              }}
              className={`py-2.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all ${
                role === r
                  ? "bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] border border-[var(--organizer-ink-primary)]"
                  : "text-[var(--organizer-ink-muted)] hover:text-[var(--organizer-ink-primary)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              IDENTITY (EMAIL)
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] py-3 pl-10 pr-4 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
              />
            </div>
          </div>

          {role !== "judge" ? (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                PASSWORD PASSKEY
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] py-3 pl-10 pr-4 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                EVENT ID (NODE)
              </label>
              <div className="relative">
                <Cpu className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
                <input
                  type="text"
                  required
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="e.g. uem-techfest"
                  className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] py-3 pl-10 pr-4 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-ink-primary)] py-4 font-mono text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[var(--organizer-gold)] hover:text-[var(--organizer-ink-primary)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            style={{ boxShadow: "4px 4px 0px 0px var(--organizer-gold)" }}
          >
            {loading ? (
              "AUTHENTICATING..."
            ) : (
              <>
                SIGN IN AS {role.toUpperCase()}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {role !== "judge" && (
          <div className="mt-8 border-t border-[var(--organizer-border)] pt-6 text-center">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              DON&apos;T HAVE AN ACCOUNT YET?
            </p>
            <button
              type="button"
              onClick={() => router.push(`/signup?role=${role}`)}
              className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-colors hover:bg-[var(--organizer-gold-light)]"
            >
              + CREATE NEW {role.toUpperCase()} ACCOUNT
            </button>
          </div>
        )}

        {role === "judge" && (
          <p className="mt-6 text-center font-mono text-[9px] font-bold uppercase leading-relaxed tracking-wide text-[var(--organizer-ink-muted)]">
            Judges cannot self-register. Your organizer must invite this email for a specific event.
          </p>
        )}
      </div>
    </div>
  );
}