"use client";

import React, { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui";
import { getOrganizerNavigation } from "@/components/layout/navigation";
import type { Sponsor } from "@/types/sponsor";

// Semantic Badges
function Badge({ type, label }: { type: 'success' | 'warning' | 'error' | 'neutral', label: string }) {
  const styles = {
    success: "bg-emerald-50/50 text-emerald-800 border-emerald-100",
    warning: "bg-amber-50/50 text-amber-800 border-amber-100",
    error: "bg-red-50/50 text-red-800 border-red-100",
    neutral: "bg-[var(--organizer-surface-hover)] text-[var(--organizer-ink-secondary)] border-[var(--organizer-border)]"
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${styles[type]}`}>
      {label}
    </span>
  );
}

export default function OrganizerSponsorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sponsors?eventId=${eventId}`);
      const json = await res.json();
      if (json.ok) setSponsors(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to load event sponsors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsors();
  }, [eventId]);

  const handleUpdateStatus = async (sponsorId: string, status: "approved" | "rejected") => {
    try {
      setActionLoading(sponsorId);
      const res = await fetch(`/api/sponsors/${sponsorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSponsors((prev) => prev.map((s) => (s.id === sponsorId ? { ...s, status } : s)));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (sponsorId: string) => {
    if (!confirm("Are you sure you want to remove this sponsor?")) return;
    try {
      setActionLoading(sponsorId);
      const res = await fetch(`/api/sponsors/${sponsorId}`, { method: "DELETE" });
      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardShell
      role="organizer"
      userName="Hackathon Lead"
      userEmail="organizer@ihi.io"
      eventName="Event Management"
      navigation={getOrganizerNavigation(eventId)}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 bg-[var(--organizer-bg)]">
        <PageHeader
          title="Sponsors & Partners"
          description="Manage sponsor tiers, bounties, and API partnerships for this hackathon."
          breadcrumbs={[{ label: "Dashboard", href: `/dashboard/events` }, { label: "Sponsors" }]}
        />

        {error && (
          <Card padding="sm" className="border-red-100 bg-red-50/50 text-red-800 text-sm">
            {error}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md" className="bg-[var(--organizer-surface)] border-[var(--organizer-border)] shadow-sm">
            <p className="text-xs font-mono font-bold text-[var(--organizer-ink-muted)] uppercase">Total Partners</p>
            <p className="text-3xl font-bold font-display text-[var(--organizer-ink-primary)] mt-1">{sponsors.length}</p>
          </Card>
          <Card padding="md" className="bg-[var(--organizer-surface)] border-[var(--organizer-border)] shadow-sm">
            <p className="text-xs font-mono font-bold text-[var(--organizer-ink-muted)] uppercase">Active / Approved</p>
            <p className="text-3xl font-bold font-display text-emerald-700 mt-1">
              {sponsors.filter((s) => s.status === "approved").length}
            </p>
          </Card>
          <Card padding="md" className="bg-[var(--organizer-surface)] border-[var(--organizer-border)] shadow-sm">
            <p className="text-xs font-mono font-bold text-[var(--organizer-ink-muted)] uppercase">Pending Reviews</p>
            <p className="text-3xl font-bold font-display text-amber-700 mt-1">
              {sponsors.filter((s) => s.status === "pending").length}
            </p>
          </Card>
        </div>

        {/* Sponsor Management Table */}
        <Card padding="none" className="overflow-hidden bg-[var(--organizer-surface)] border-[var(--organizer-border)] shadow-sm">
          <div className="p-6 border-b border-[var(--organizer-border)] flex items-center justify-between bg-[var(--organizer-surface-hover)]">
            <h2 className="text-lg font-bold font-display text-[var(--organizer-ink-primary)]">Event Sponsor Directory</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-mono text-[var(--organizer-ink-muted)] animate-pulse">
              Loading sponsor list...
            </div>
          ) : sponsors.length === 0 ? (
            <div className="p-10 text-center text-sm font-mono text-[var(--organizer-ink-muted)]">
              No sponsors registered for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[var(--organizer-surface-hover)] text-xs font-mono uppercase text-[var(--organizer-ink-muted)] border-b border-[var(--organizer-border)] font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-[var(--organizer-ink-muted)]">Company</th>
                    <th className="px-6 py-4 text-[var(--organizer-ink-muted)]">Tier</th>
                    <th className="px-6 py-4 text-[var(--organizer-ink-muted)]">Technologies</th>
                    <th className="px-6 py-4 text-[var(--organizer-ink-muted)]">Status</th>
                    <th className="px-6 py-4 text-right text-[var(--organizer-ink-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--organizer-border)]">
                  {sponsors.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--organizer-surface-hover)] transition-colors duration-150">
                      <td className="px-6 py-4 font-bold font-display text-[var(--organizer-ink-primary)]">
                        {s.company_name}
                        <span className="block text-xs font-mono font-normal text-[var(--organizer-ink-secondary)] mt-0.5">
                          {s.contact_email}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--organizer-gold-light)] text-[var(--organizer-gold-deep)] border border-[var(--organizer-gold-champagne)]">
                          {s.sponsorship_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[var(--organizer-ink-secondary)]">
                        {s.technologies.join(", ") || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          type={s.status === "approved" ? "success" : s.status === "pending" ? "warning" : "error"} 
                          label={s.status} 
                        />
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        {s.status === "pending" && (
                          <Button
                            size="sm"
                            loading={actionLoading === s.id}
                            onClick={() => handleUpdateStatus(s.id, "approved")}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-sm"
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={actionLoading === s.id}
                          onClick={() => handleDelete(s.id)}
                          className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
