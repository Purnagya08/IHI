"use client";

import { useState, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignupRoleTabs, type SignupRole } from "./SignupRoleTabs";
import { getCleanAuthErrorMessage } from "@/lib/auth/errors";
import { setAuthSession } from "@/lib/auth";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If someone tries to pass ?role=judge, force them to participant.
  const initialRole = searchParams.get("role") as string;
  const validRole: SignupRole = ["participant", "organizer"].includes(initialRole) 
    ? (initialRole as SignupRole) 
    : "participant";

  const [role, setRole] = useState<SignupRole>(validRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    return role === "organizer" 
      ? "Setup your organizer profile to start hosting." 
      : "Join the community to build and compete.";
  }, [role]);

  async function onSubmit(e: FormEvent) {
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
          eventName: data.user?.eventName || "Stanford TreeHacks 2025",
          role: data.user?.role || role,
        },
        data.token
      );

      if ((data.user?.role || role) === "participant") {
        router.push("/hackathons");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
      
    } catch (err) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-black md:text-4xl">
          Create an account
        </h1>
        <p className="mt-2 font-body text-base text-gray-500">{subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <SignupRoleTabs
          value={role}
          onChange={(r) => {
            setRole(r);
            setError(null);
          }}
        />

        {/* Full Name */}
        <div>
          <label htmlFor="name" className="mb-1.5 block font-body text-sm font-medium text-black">
            Full Name
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <UserIcon />
            </span>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "organizer" ? "Jane Doe" : "Alex Chen"}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 font-body text-sm text-black outline-none transition-shadow placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block font-body text-sm font-medium text-black">
            Email address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <MailIcon />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 font-body text-sm text-black outline-none transition-shadow placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gold/40"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block font-body text-sm font-medium text-black">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <LockIcon />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-12 font-body text-sm text-black outline-none transition-shadow placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-xs font-semibold text-gray-500 hover:text-black"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="rounded-lg border border-black/10 bg-gray-50 px-3 py-2 font-body text-sm text-black flex items-start gap-2">
            <span className="mt-0.5 text-black"><AlertIcon /></span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold px-6 font-body text-sm font-bold uppercase tracking-wider text-black transition-all duration-200 hover:-translate-y-px hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
        >
          {loading ? "Creating account…" : "Create Account"}
          {!loading && <ArrowIcon />}
        </button>
      </form>

      <p className="mt-8 text-center font-body text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href={`/login?role=${role}`}
          className="font-semibold text-black underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

// Minimal inline icons
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 4.5L8 9l5.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 7V5.5a3 3 0 016 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5v4.5M8 11.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
