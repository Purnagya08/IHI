"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Upload,
  Compass,
  LogOut,
  Trophy,
  User,
} from "lucide-react";

interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

const NAV = [
  { href: "/team", label: "My Team", icon: Users },
  { href: "/submit", label: "Submit", icon: Upload },
  { href: "/team?tab=discover", label: "Discover Teams", icon: Compass },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const isActive = (href: string) => {
    if (href === "/team") {
      return pathname === "/team" && tabParam !== "discover";
    }
    if (href === "/team?tab=discover") {
      return pathname === "/team" && tabParam === "discover";
    }
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 border-2 px-3 py-2.5 text-xs font-bold font-mono uppercase tracking-wider transition-transform ${
              active
                ? "border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-[var(--organizer-ink-primary)] shadow-[3px_3px_0px_0px_var(--organizer-ink-primary)]"
                : "border-transparent text-[var(--organizer-ink-secondary)] hover:border-[var(--organizer-border)] hover:bg-[var(--organizer-gold-light)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--organizer-ink-primary)]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<ParticipantUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        // Single source of truth: IHI JWT session via /api/auth/me
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) {
            setUser(null);
            setLoadingUser(false);
          }
          return;
        }

        const data = await res.json();
        const u = data.user;
        if (!u) {
          if (mounted) {
            setUser(null);
            setLoadingUser(false);
          }
          return;
        }

        const displayName = (
          u.full_name ||
          u.name ||
          u.username ||
          (u.email ? u.email.split("@")[0] : "HACKER")
        ).toString();

        if (mounted) {
          setUser({
            id: u.id || u.sub,
            name: displayName.toUpperCase(),
            email: u.email || "No email",
            avatarUrl: u.avatar_url || null,
          });
        }
      } catch (err) {
        console.error("Failed to load participant user:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--organizer-bg)] text-[var(--organizer-ink-primary)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b-2 border-[var(--organizer-ink-primary)] p-4">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] font-black font-display text-sm text-[var(--organizer-ink-primary)] shadow-[2px_2px_0px_0px_var(--organizer-ink-primary)]">
            IHI
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-muted)]">
              Participant Hub
            </div>
            <div className="truncate text-xs font-black font-display uppercase tracking-tight">
              Hacker Workspace
            </div>
          </div>
        </div>

        {/* Navigation */}
        <Suspense fallback={<div className="p-3 text-xs font-mono">Loading menu…</div>}>
          <SidebarNav />
        </Suspense>

        {/* User Footer */}
        <div className="border-t-2 border-[var(--organizer-ink-primary)] p-3 space-y-2">
          <div
            className="flex items-center gap-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-2"
            style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] text-xs font-black font-mono text-[var(--organizer-ink-primary)]">
              {loadingUser
                ? "…"
                : (user?.name || "G")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black font-display uppercase tracking-tight">
                {loadingUser ? "Loading…" : user?.name || "Guest Hacker"}
              </div>
              <div className="truncate text-[10px] font-mono text-[var(--organizer-ink-muted)]">
                {user?.email || "Not signed in"}
              </div>
            </div>
          </div>

          {!user ? (
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold)] px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--organizer-ink-primary)] transition-transform hover:-translate-y-0.5"
              style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
            >
              Sign In
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors hover:bg-red-50 hover:text-red-900"
              style={{ boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 min-h-screen min-w-0">{children}</main>
    </div>
  );
}