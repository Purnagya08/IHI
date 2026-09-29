"use client";

import React, { useState, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Lock, ArrowRight, AlertCircle, Shield } from "lucide-react";
import { setAuthSession } from "@/lib/auth";
import { getCleanAuthErrorMessage } from "@/lib/auth/errors";

type Role = "participant" | "organizer";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If someone passes ?role=..., safely parse it
  const initialRole = searchParams.get("role") as string;
  const validRole: Role = ["participant", "organizer"].includes(initialRole) 
    ? (initialRole as Role) 
    : "participant";

  const [role, setRole] = useState<Role>(validRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim() || !email.trim() || !password) {
        throw new Error("All fields are required.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name: name.trim(), email: email.trim(), password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account.");

      setAuthSession(
        {
          name: data.user?.name || name.trim(),
          email: data.user?.email || email.trim(),
          eventName: "IHI Console",
          role: data.user?.role || role,
        },
        data.token
      );

      // --- HARD REDIRECT TO BYPASS CACHE ---
      const nextUrl = searchParams.get("redirect") || searchParams.get("next");
      
      if (role === "organizer") {
        window.location.replace("/dashboard/events");
        return;
      }

      if (nextUrl && nextUrl.startsWith("/") && !nextUrl.includes("ashish01234")) {
        window.location.replace(nextUrl);
        return;
      }

      window.location.replace("/participant/dashboard");
      
    } catch (err) {
      setError(getCleanAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* ERROR BANNER */}
      {error && (
        <div
          className="mb-6 border-2 border-red-600 bg-red-50 p-4 flex items-start gap-3"
          style={{ boxShadow: "4px 4px 0px 0px #dc2626" }}
        >
          <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-widest text-red-700 mb-0.5">
              Registration Error
            </div>
            <div className="font-mono text-xs font-bold text-red-900">{error}</div>
          </div>
        </div>
      )}

      {/* MAIN CARD — Blueprint UI */}
      <div
        className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-6 md:p-8"
        style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black font-display uppercase tracking-tight text-[var(--organizer-ink-primary)] leading-none">
            INITIALIZE <span className="text-[var(--organizer-gold-deep)]">PROFILE.</span>
          </h1>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            CREATE YOUR SYSTEM IDENTITY TO PROCEED.
          </p>
        </div>

        {/* ROLE TABS */}
        <div className="grid grid-cols-2 gap-0 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-1 mb-6">
          {(["participant", "organizer"] as const).map((r) => (
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

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* NAME */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              Full Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] py-3 pl-10 pr-4 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              Identity (Email)
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

          {/* PASSWORD */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              Secure Passkey
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--organizer-ink-muted)]" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] py-3 pl-10 pr-4 font-mono text-xs font-bold text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold)]"
              />
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] py-4 font-mono text-xs font-black uppercase tracking-widest text-[var(--organizer-ink-primary)] transition-all hover:bg-[var(--organizer-gold-light)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-6"
            style={{ boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)" }}
          >
            {loading ? (
              "INITIALIZING..."
            ) : (
              <>
                CREATE {role.toUpperCase()} ACCOUNT
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* FOOTER LOGIN */}
        <div className="mt-8 border-t-2 border-[var(--organizer-border)] pt-6 text-center">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
            Already have clearance?
          </p>
          <button
            type="button"
            onClick={() => {
              const redirect = searchParams.get("redirect") || searchParams.get("next");
              const url = redirect ? `/login?role=${role}&redirect=${encodeURIComponent(redirect)}` : `/login?role=${role}`;
              router.push(url);
            }}
            className="inline-flex items-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-wider text-[var(--organizer-ink-primary)] transition-colors hover:bg-[var(--organizer-gold-light)]"
          >
            SIGN IN TO EXISTING ACCOUNT
          </button>
        </div>

      </div>
    </div>
  );
}