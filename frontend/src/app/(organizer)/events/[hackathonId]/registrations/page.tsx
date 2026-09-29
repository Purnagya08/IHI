"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  UsersRound,
  UserX,
  Shield,
  ArrowUpDown,
  RefreshCw,
  X,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Registration {
  id: string;
  user_id: string;
  hackathon_id: string;
  team_id: string | null;
  role: string;
  status: string;
  registered_at: string;
  users: {
    id: string;
    email: string;
  };
  profiles: {
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string[] | null;
    college: string | null;
    phone: string | null;
    github: string | null;
    linkedin: string | null;
  };
  teams: {
    id: string;
    name: string;
    invite_code: string;
  } | null;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  rejected: number;
  with_team: number;
  without_team: number;
  teams_count: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ─── Floating Shapes (Blueprint BG) ──────────────────────────────────────────

function FloatingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[
        { size: 80, x: "10%", y: "15%", delay: 0, shape: "square" },
        { size: 60, x: "85%", y: "25%", delay: 1.2, shape: "circle" },
        { size: 100, x: "70%", y: "70%", delay: 0.6, shape: "triangle" },
        { size: 50, x: "25%", y: "80%", delay: 1.8, shape: "square" },
        { size: 70, x: "50%", y: "10%", delay: 2.4, shape: "circle" },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: s.x, top: s.y }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, s.shape === "square" ? 90 : 360, 0],
          }}
          transition={{
            duration: 8,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {s.shape === "square" && (
            <div
              className="border-2 border-[var(--organizer-gold-deep)] opacity-[0.06]"
              style={{ width: s.size, height: s.size }}
            />
          )}
          {s.shape === "circle" && (
            <div
              className="border-2 border-[var(--organizer-ink-primary)] opacity-[0.05] rounded-full"
              style={{ width: s.size, height: s.size }}
            />
          )}
          {s.shape === "triangle" && (
            <div
              className="opacity-[0.05]"
              style={{
                width: 0,
                height: 0,
                borderLeft: `${s.size / 2}px solid transparent`,
                borderRight: `${s.size / 2}px solid transparent`,
                borderBottom: `${s.size}px solid var(--organizer-ink-primary)`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    confirmed: {
      bg: "bg-emerald-100 border-emerald-600",
      text: "text-emerald-800",
      icon: <CheckCircle2 size={12} />,
    },
    pending: {
      bg: "bg-amber-100 border-amber-600",
      text: "text-amber-800",
      icon: <Clock size={12} />,
    },
    rejected: {
      bg: "bg-red-100 border-red-600",
      text: "text-red-800",
      icon: <XCircle size={12} />,
    },
    waitlisted: {
      bg: "bg-blue-100 border-blue-600",
      text: "text-blue-800",
      icon: <AlertTriangle size={12} />,
    },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 border-2 font-mono text-[10px] font-bold uppercase tracking-widest ${c.bg} ${c.text}`}
    >
      {c.icon}
      {status}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="border-2 border-[var(--organizer-ink-primary)] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] flex items-center justify-center font-display font-black text-[var(--organizer-ink-primary)]"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-2 border-[var(--organizer-ink-primary)] p-4 ${
        accent
          ? "bg-[var(--organizer-gold-light)]"
          : "bg-[var(--organizer-surface)]"
      }`}
      style={{
        boxShadow: accent
          ? "4px 4px 0px 0px var(--organizer-gold-deep)"
          : "4px 4px 0px 0px var(--organizer-ink-primary)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
          {label}
        </span>
        <span className="text-[var(--organizer-ink-muted)]">{icon}</span>
      </div>
      <p className="font-display font-black text-3xl text-[var(--organizer-ink-primary)]">
        {value}
      </p>
    </motion.div>
  );
}

// ─── Participant Detail Modal ────────────────────────────────────────────────

function ParticipantDetailModal({
  registration,
  teamMembers,
  onClose,
  onStatusChange,
}: {
  registration: Registration;
  teamMembers: any[];
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const p = registration.profiles;
  const u = registration.users;
  const t = registration.teams;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--organizer-surface)] border-2 border-[var(--organizer-ink-primary)]"
        style={{ boxShadow: "8px 8px 0px 0px var(--organizer-ink-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b-2 border-[var(--organizer-ink-primary)] p-6 bg-[var(--organizer-gold-light)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={p?.full_name || "Unknown"} url={p?.avatar_url} size={64} />
              <div>
                <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-[var(--organizer-ink-primary)]">
                  {p?.full_name || "Unknown Participant"}
                </h2>
                <p className="font-mono text-[11px] text-[var(--organizer-ink-muted)] mt-1">
                  {u?.email}
                </p>
                <div className="mt-2">
                  <StatusBadge status={registration.status} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] hover:bg-red-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<Mail size={14} />} label="Email" value={u?.email} />
              <InfoRow icon={<Phone size={14} />} label="Phone" value={p?.phone} />
              <InfoRow
                icon={<GraduationCap size={14} />}
                label="College"
                value={p?.college}
              />
              <InfoRow
                icon={<Shield size={14} />}
                label="Role"
                value={registration.role || "participant"}
              />
            </div>
          </div>

          {/* Links */}
          {(p?.github || p?.linkedin) && (
            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
                Social Links
              </h3>
              <div className="flex gap-3">
                {p?.github && (
                  <a
                    href={p.github.startsWith("http") ? p.github : `https://github.com/${p.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-xs hover:bg-[var(--organizer-gold-light)] transition-colors"
                  >
                    <Github size={14} /> GitHub <ExternalLink size={10} />
                  </a>
                )}
                {p?.linkedin && (
                  <a
                    href={p.linkedin.startsWith("http") ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-xs hover:bg-[var(--organizer-gold-light)] transition-colors"
                  >
                    <Linkedin size={14} /> LinkedIn <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {p?.skills && p.skills.length > 0 && (
            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {p.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-gold-deep)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {p?.bio && (
            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
                Bio
              </h3>
              <p className="text-sm text-[var(--organizer-ink-primary)] leading-relaxed border-l-4 border-[var(--organizer-gold-deep)] pl-4 bg-[var(--organizer-bg)] p-3">
                {p.bio}
              </p>
            </div>
          )}

          {/* Team Info */}
          {t && (
            <div>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
                Team Details
              </h3>
              <div className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-black uppercase text-[var(--organizer-ink-primary)]">
                    {t.name}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-1 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]">
                    Code: {t.invite_code}
                  </span>
                </div>
                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    {teamMembers.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-2 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)]"
                      >
                        <Avatar
                          name={m.profiles?.full_name || "?"}
                          url={m.profiles?.avatar_url}
                          size={28}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[var(--organizer-ink-primary)]">
                            {m.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="font-mono text-[10px] text-[var(--organizer-ink-muted)]">
                            {m.users?.email}
                          </p>
                        </div>
                        {m.role === "leader" && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[var(--organizer-gold-deep)] bg-[var(--organizer-gold-light)] text-[var(--organizer-gold-deep)]">
                            Leader
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registration Meta */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
              Registration Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow
                icon={<Clock size={14} />}
                label="Registered"
                value={
                  registration.registered_at
                    ? new Date(registration.registered_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A"
                }
              />
              <InfoRow
                icon={<UsersRound size={14} />}
                label="Team"
                value={t?.name || "No Team"}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)] mb-3">
              Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              {registration.status !== "confirmed" && (
                <button
                  onClick={() => onStatusChange(registration.id, "confirmed")}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-700 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold uppercase tracking-widest hover:bg-emerald-200 transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px rgb(4 120 87)" }}
                >
                  <CheckCircle2 size={14} /> Confirm
                </button>
              )}
              {registration.status !== "rejected" && (
                <button
                  onClick={() => onStatusChange(registration.id, "rejected")}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-red-700 bg-red-100 text-red-800 font-mono text-xs font-bold uppercase tracking-widest hover:bg-red-200 transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px rgb(185 28 28)" }}
                >
                  <XCircle size={14} /> Reject
                </button>
              )}
              {registration.status !== "waitlisted" && (
                <button
                  onClick={() => onStatusChange(registration.id, "waitlisted")}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-blue-700 bg-blue-100 text-blue-800 font-mono text-xs font-bold uppercase tracking-widest hover:bg-blue-200 transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px rgb(29 78 216)" }}
                >
                  <AlertTriangle size={14} /> Waitlist
                </button>
              )}
              {registration.status !== "pending" && (
                <button
                  onClick={() => onStatusChange(registration.id, "pending")}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-amber-700 bg-amber-100 text-amber-800 font-mono text-xs font-bold uppercase tracking-widest hover:bg-amber-200 transition-colors"
                  style={{ boxShadow: "3px 3px 0px 0px rgb(180 83 9)" }}
                >
                  <Clock size={14} /> Set Pending
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-2 p-2 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)]">
      <span className="text-[var(--organizer-ink-muted)]">{icon}</span>
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
          {label}
        </p>
        <p className="text-sm font-bold text-[var(--organizer-ink-primary)]">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Content (uses useSearchParams) ─────────────────────────────────────

function RegistrationsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hackathonId = params.hackathonId as string;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [hackathonTitle, setHackathonTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [teamFilter, setTeamFilter] = useState(
    searchParams.get("team") || "all"
  );
  const [sortBy, setSortBy] = useState("registered_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );

  // Detail modal
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [detailTeamMembers, setDetailTeamMembers] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        hackathon_id: hackathonId,
        search,
        status: statusFilter,
        team: teamFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: String(page),
        limit: "20",
      });

      const res = await fetch(`/api/organizer/registrations?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }

      const data = await res.json();
      setRegistrations(data.registrations || []);
      setStats(data.stats);
      setPagination(data.pagination);
      setHackathonTitle(data.hackathon?.title || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hackathonId, search, statusFilter, teamFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const openDetail = async (reg: Registration) => {
    setSelectedReg(reg);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/organizer/registrations/${reg.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailTeamMembers(data.team_members || []);
      }
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (regId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/organizer/registrations/${regId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Update local state
        setRegistrations((prev) =>
          prev.map((r) => (r.id === regId ? { ...r, status: newStatus } : r))
        );
        if (selectedReg?.id === regId) {
          setSelectedReg((prev) =>
            prev ? { ...prev, status: newStatus } : null
          );
        }
        // Refresh stats
        fetchRegistrations();
      }
    } catch {
      // silent
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    const promises = Array.from(selectedIds).map((id) =>
      fetch(`/api/organizer/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
    );
    await Promise.all(promises);
    setSelectedIds(new Set());
    fetchRegistrations();
  };

  const handleExport = () => {
    window.open(
      `/api/organizer/registrations/export?hackathon_id=${hackathonId}`,
      "_blank"
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === registrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="min-h-screen bg-[var(--organizer-bg)] relative"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    >
      <FloatingShapes />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--organizer-ink-muted)] hover:text-[var(--organizer-ink-primary)] font-mono text-xs uppercase tracking-widest mb-4 transition-colors"
          >
            <ChevronLeft size={14} /> Back to Event
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-black text-4xl uppercase tracking-tighter text-[var(--organizer-ink-primary)]">
                Registrations
              </h1>
              {hackathonTitle && (
                <p className="font-mono text-sm text-[var(--organizer-ink-muted)] mt-1">
                  {hackathonTitle}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchRegistrations}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] font-mono text-xs font-bold uppercase tracking-widest hover:bg-[var(--organizer-gold-light)] transition-colors"
                style={{
                  boxShadow: "3px 3px 0px 0px var(--organizer-ink-primary)",
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)] font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-gold-deep)] hover:bg-[var(--organizer-gold-deep)] hover:text-white transition-colors"
                style={{
                  boxShadow: "3px 3px 0px 0px var(--organizer-gold-deep)",
                }}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 border-2 border-red-600 bg-red-50 text-red-800 font-mono text-sm"
            style={{ boxShadow: "4px 4px 0px 0px rgb(185 28 28)" }}
          >
            <strong>Error:</strong> {error}
          </motion.div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<Users size={18} />}
              accent
            />
            <StatCard
              label="Confirmed"
              value={stats.confirmed}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Clock size={18} />}
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon={<XCircle size={18} />}
            />
            <StatCard
              label="In Teams"
              value={stats.with_team}
              icon={<UsersRound size={18} />}
            />
            <StatCard
              label="Solo"
              value={stats.without_team}
              icon={<UserX size={18} />}
            />
          </div>
        )}

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4"
          style={{
            boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
          }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--organizer-ink-muted)]"
              />
              <input
                type="text"
                placeholder="Search by name, email, college, or team..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-sm text-[var(--organizer-ink-primary)] placeholder:text-[var(--organizer-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--organizer-gold-deep)]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--organizer-ink-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>

            {/* Team Filter */}
            <select
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-xs font-bold uppercase tracking-widest text-[var(--organizer-ink-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Participants</option>
              <option value="with_team">In a Team</option>
              <option value="without_team">Solo / No Team</option>
            </select>

            {/* Sort */}
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="flex items-center gap-2 px-3 py-2.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-xs font-bold uppercase tracking-widest hover:bg-[var(--organizer-gold-light)] transition-colors"
            >
              <ArrowUpDown size={14} />
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </button>
          </div>

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t-2 border-[var(--organizer-ink-primary)]"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--organizer-ink-primary)]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() => handleBulkStatusChange("confirmed")}
                    className="px-3 py-1.5 border-2 border-emerald-600 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-200"
                  >
                    Confirm All
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("rejected")}
                    className="px-3 py-1.5 border-2 border-red-600 bg-red-100 text-red-800 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-200"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("waitlisted")}
                    className="px-3 py-1.5 border-2 border-blue-600 bg-blue-100 text-blue-800 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-blue-200"
                  >
                    Waitlist All
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-3 py-1.5 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--organizer-gold-light)]"
                  >
                    Clear Selection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] overflow-hidden"
          style={{
            boxShadow: "6px 6px 0px 0px var(--organizer-ink-primary)",
          }}
        >
          {loading ? (
            <div className="p-16 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <RefreshCw
                  size={32}
                  className="text-[var(--organizer-ink-muted)]"
                />
              </motion.div>
              <p className="font-mono text-sm text-[var(--organizer-ink-muted)] mt-4">
                Loading registrations...
              </p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-16 text-center">
              <Users
                size={48}
                className="mx-auto text-[var(--organizer-ink-muted)] mb-4 opacity-40"
              />
              <h3 className="font-display font-black text-xl uppercase tracking-tighter text-[var(--organizer-ink-primary)]">
                No Registrations Found
              </h3>
              <p className="font-mono text-sm text-[var(--organizer-ink-muted)] mt-2">
                {search || statusFilter !== "all" || teamFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No one has registered for this event yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-gold-light)]">
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === registrations.length &&
                          registrations.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 border-2 border-[var(--organizer-ink-primary)] cursor-pointer accent-[var(--organizer-gold-deep)]"
                      />
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      S.No
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      Participant
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      College
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      Team
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      Status
                    </th>
                    <th className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      Registered
                    </th>
                    <th className="p-3 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, index) => (
                    <motion.tr
                      key={reg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`border-b border-[var(--organizer-ink-primary)] border-opacity-20 hover:bg-[var(--organizer-gold-light)] hover:bg-opacity-30 transition-colors cursor-pointer ${
                        selectedIds.has(reg.id) ? "bg-[var(--organizer-gold-light)] bg-opacity-50" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(reg.id)}
                          onChange={() => toggleSelect(reg.id)}
                          className="w-4 h-4 border-2 border-[var(--organizer-ink-primary)] cursor-pointer accent-[var(--organizer-gold-deep)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs text-[var(--organizer-ink-muted)]">
                          {(pagination ? (pagination.page - 1) * pagination.limit : 0) +
                            index +
                            1}
                        </span>
                      </td>
                      <td className="p-3" onClick={() => openDetail(reg)}>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={reg.profiles?.full_name || "?"}
                            url={reg.profiles?.avatar_url}
                            size={36}
                          />
                          <div>
                            <p className="font-bold text-sm text-[var(--organizer-ink-primary)]">
                              {reg.profiles?.full_name || "Unknown"}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--organizer-ink-muted)]">
                              {reg.users?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3" onClick={() => openDetail(reg)}>
                        <span className="text-sm text-[var(--organizer-ink-primary)]">
                          {reg.profiles?.college || (
                            <span className="text-[var(--organizer-ink-muted)] italic">
                              N/A
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3" onClick={() => openDetail(reg)}>
                        {reg.teams ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] font-mono text-[10px] font-bold">
                            <UsersRound size={10} />
                            {reg.teams.name}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-[var(--organizer-ink-muted)] italic">
                            No Team
                          </span>
                        )}
                      </td>
                      <td className="p-3" onClick={() => openDetail(reg)}>
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="p-3" onClick={() => openDetail(reg)}>
                        <span className="font-mono text-[11px] text-[var(--organizer-ink-muted)]">
                          {reg.registered_at
                            ? new Date(reg.registered_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "N/A"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(reg);
                            }}
                            className="p-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-bg)] hover:bg-[var(--organizer-gold-light)] transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {reg.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(reg.id, "confirmed");
                              }}
                              className="p-2 border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700"
                              title="Confirm"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="border-t-2 border-[var(--organizer-ink-primary)] p-4 flex items-center justify-between bg-[var(--organizer-bg)]">
              <span className="font-mono text-[11px] text-[var(--organizer-ink-muted)]">
                Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] hover:bg-[var(--organizer-gold-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    let pageNum: number;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 border-2 border-[var(--organizer-ink-primary)] font-mono text-xs font-bold transition-colors ${
                          pageNum === page
                            ? "bg-[var(--organizer-ink-primary)] text-[var(--organizer-surface)]"
                            : "bg-[var(--organizer-surface)] text-[var(--organizer-ink-primary)] hover:bg-[var(--organizer-gold-light)]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(pagination.total_pages, p + 1)
                    )
                  }
                  disabled={page >= pagination.total_pages}
                  className="p-2 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] hover:bg-[var(--organizer-gold-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Stats Footer */}
        {stats && stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 border-2 border-[var(--organizer-ink-primary)] bg-[var(--organizer-surface)] p-4 flex items-center justify-between"
            style={{
              boxShadow: "4px 4px 0px 0px var(--organizer-ink-primary)",
            }}
          >
            <div className="flex items-center gap-2">
              <BarChart3
                size={16}
                className="text-[var(--organizer-gold-deep)]"
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--organizer-ink-muted)]">
                Quick Stats
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="font-mono text-xs text-[var(--organizer-ink-primary)]">
                <strong>{(stats as any).teams_count || 0}</strong> Teams
              </span>
              <span className="font-mono text-xs text-[var(--organizer-ink-primary)]">
                <strong>
                  {stats.total > 0
                    ? Math.round((stats.confirmed / stats.total) * 100)
                    : 0}
                  %
                </strong>{" "}
                Confirmed
              </span>
              <span className="font-mono text-xs text-[var(--organizer-ink-primary)]">
                <strong>
                  {stats.total > 0
                    ? Math.round((stats.with_team / stats.total) * 100)
                    : 0}
                  %
                </strong>{" "}
                In Teams
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReg && (
          <ParticipantDetailModal
            registration={selectedReg}
            teamMembers={detailTeamMembers}
            onClose={() => {
              setSelectedReg(null);
              setDetailTeamMembers([]);
            }}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page Export (with Suspense boundary for useSearchParams) ─────────────────

export default function RegistrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--organizer-bg)] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw
              size={32}
              className="text-[var(--organizer-ink-muted)]"
            />
          </motion.div>
        </div>
      }
    >
      <RegistrationsContent />
    </Suspense>
  );
}