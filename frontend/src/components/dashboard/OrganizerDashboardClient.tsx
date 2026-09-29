'use client';

import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { GridBackground } from '@/components/dashboard/GridBackground';
import { CommandKModal } from '@/components/dashboard/CommandKModal';
import { AssignJudgesModal } from '@/components/dashboard/AssignJudgesModal';
import { organizerNavigation } from '@/components/layout/navigation';
import { getAuthSession, type UserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

/* ==========================================================================
   TYPES
   ========================================================================== */

type ActivityType = 'submission' | 'score' | 'team' | 'verified';

export interface DashboardActivity {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: ActivityType;
}

export interface DashboardMetrics {
  registrations: number;
  approved: number;
  pending: number;
  blocked: number;
  teams: number;
  submissions: number;
  drafts: number;
  judging: number;
  capacity: number | null;
  utilizationPercent: number | null;
  soloLooking: number;
  completionPercent: number;
}

export interface TrackStat {
  name: string;
  count: number;
}

interface DashboardApiResponse {
  event?: {
    id: string;
    name: string;
    maxParticipants: number | null;
    submissionDeadline: string | null;
  };
  registration?: {
    total: number;
    capacity: number | null;
    utilizationPercent: number | null;
  };
  teams?: {
    totalTeams: number;
    soloLookingCount: number;
    totalParticipantsInTeams: number;
  };
  submissions?: {
    draftCount: number;
    finalCount: number;
    totalTeams: number;
    completionPercent: number;
  };
  serverTime?: string;
  error?: string;
}

interface Props {
  /** When provided by a Server page — skip client refetch on first paint */
  eventId?: string;
  eventName?: string;
  initialMetrics?: Partial<DashboardMetrics>;
  topTracks?: TrackStat[];
  initialActivities?: DashboardActivity[];
}

/* ==========================================================================
   CONSTANTS / HELPERS
   ========================================================================== */

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const EMPTY_METRICS: DashboardMetrics = {
  registrations: 0,
  approved: 0,
  pending: 0,
  blocked: 0,
  teams: 0,
  submissions: 0,
  drafts: 0,
  judging: 0,
  capacity: null,
  utilizationPercent: null,
  soloLooking: 0,
  completionPercent: 0,
};

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

function mapApiToMetrics(api: DashboardApiResponse): DashboardMetrics {
  return {
    registrations: api.registration?.total ?? 0,
    approved: 0, // filled from registrations breakdown when available
    pending: 0,
    blocked: 0,
    teams: api.teams?.totalTeams ?? 0,
    submissions: api.submissions?.finalCount ?? 0,
    drafts: api.submissions?.draftCount ?? 0,
    judging: 0,
    capacity: api.registration?.capacity ?? null,
    utilizationPercent: api.registration?.utilizationPercent ?? null,
    soloLooking: api.teams?.soloLookingCount ?? 0,
    completionPercent: api.submissions?.completionPercent ?? 0,
  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function OrganizerDashboardClient({
  eventId: eventIdProp,
  eventName: eventNameProp,
  initialMetrics,
  topTracks: topTracksProp,
  initialActivities,
}: Props = {}) {
  const router = useRouter();
  const params = useParams();

  // Resolve event id: prop → route param → empty
  const routeEventId =
    (params?.eventId as string) || (params?.id as string) || '';
  const eventId = eventIdProp || routeEventId;

  const [user, setUser] = useState<UserProfile>({
    name: 'Organizer',
    email: 'organizer@platform.com',
    eventName: eventNameProp || 'Live Event Console',
  });

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    ...EMPTY_METRICS,
    ...initialMetrics,
  });
  const [eventName, setEventName] = useState(
    eventNameProp || user.eventName || 'Live Event Console'
  );
  const [topTracks, setTopTracks] = useState<TrackStat[]>(topTracksProp || []);
  const [activities, setActivities] = useState<DashboardActivity[]>(
    initialActivities || []
  );

  const [currentTime, setCurrentTime] = useState('');
  const [commandKOpen, setCommandKOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<
    'all' | 'submission' | 'score' | 'team'
  >('all');
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  /* ---------- Session ---------- */
  useEffect(() => {
    const session = getAuthSession();
    if (session?.name) {
      setUser((prev) => ({
        ...prev,
        ...session,
        eventName: eventNameProp || session.eventName || prev.eventName,
      }));
    }
  }, [eventNameProp]);

  /* ---------- Clock ---------- */
  useEffect(() => {
    const tick = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- ⌘K ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandKOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---------- REAL DATA LOAD ---------- */
  const loadDashboard = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (!isValidUUID(eventId)) {
      setError(null);
      setMetrics(EMPTY_METRICS);
      setTopTracks([]);
      setActivities([]);
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setError(null);

      // 1) Aggregate metrics from existing production API
      const res = await fetch(
        `/api/dashboard/${encodeURIComponent(eventId)}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Dashboard API ${res.status}`);
      }

      const api = (await res.json()) as DashboardApiResponse;
      const base = mapApiToMetrics(api);
      if (api.event?.name) setEventName(api.event.name);

      // 2) Registration status breakdown + track distribution (real)
      const { data: regs } = await supabase
        .from('registrations')
        .select('status, track')
        .eq('event_id', eventId);

      const approved =
        regs?.filter((r) => r.status === 'approved').length ?? 0;
      const pending =
        regs?.filter((r) => r.status === 'pending').length ?? 0;
      const blocked =
        regs?.filter(
          (r) => r.status === 'rejected' || r.status === 'withdrawn'
        ).length ?? 0;

      const trackMap = (regs || []).reduce(
        (acc, row) => {
          const key = row.track || 'General';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const tracks = Object.entries(trackMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      // 3) Recent audit log → activity feed (real)
      const { data: logs } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(12);

      const feed: DashboardActivity[] = (logs || []).map((log) => {
        let type: ActivityType = 'verified';
        const ent = (log.entity_type || '').toLowerCase();
        if (ent.includes('submission')) type = 'submission';
        else if (ent.includes('score')) type = 'score';
        else if (ent.includes('team')) type = 'team';

        return {
          id: log.id,
          title: `${(log.entity_type || 'system').toUpperCase()} · ${String(
            log.action || ''
          )
            .replace(/_/g, ' ')
            .toUpperCase()}`,
          desc: `Logged action on ${log.entity_type || 'entity'}`,
          time: relativeTime(log.created_at),
          type,
        };
      });

      // 4) Judging progress from scores (real, safe if empty)
      const { count: scoreCount } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const { count: finalSubCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .in('status', ['submitted', 'locked', 'final']);

      const judgingPct =
        finalSubCount && finalSubCount > 0
          ? Math.min(
              100,
              Math.round(((scoreCount || 0) / finalSubCount) * 100)
            )
          : 0;

      setMetrics({
        ...base,
        approved,
        pending,
        blocked,
        judging: judgingPct,
      });
      setTopTracks(tracks);
      setActivities(feed);
    } catch (err) {
      console.error('OrganizerDashboard load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      // Keep last known metrics; don't inject fake numbers
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    // If server already passed full initialMetrics, still refresh in background
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboard();
  };

  /* ---------- CSV (real snapshot) ---------- */
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const rows = [
        ['Metric', 'Value'],
        ['Event ID', eventId || ''],
        ['Event Name', eventName],
        ['Registrations', String(metrics.registrations)],
        ['Approved', String(metrics.approved)],
        ['Pending', String(metrics.pending)],
        ['Blocked', String(metrics.blocked)],
        ['Teams', String(metrics.teams)],
        ['Submissions (final/locked/submitted)', String(metrics.submissions)],
        ['Drafts', String(metrics.drafts)],
        ['Solo looking', String(metrics.soloLooking)],
        ['Judging %', String(metrics.judging)],
        ['Capacity', metrics.capacity == null ? '' : String(metrics.capacity)],
        [
          'Utilization %',
          metrics.utilizationPercent == null
            ? ''
            : String(metrics.utilizationPercent),
        ],
        ...topTracks.map((t) => [`Track: ${t.name}`, String(t.count)]),
      ];
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `IHI_Dashboard_${eventId || 'export'}_${
        new Date().toISOString().split('T')[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  /* ---------- Derived UI ---------- */
  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (item) => feedFilter === 'all' || item.type === feedFilter
      ),
    [activities, feedFilter]
  );

  const firstName = user.name ? user.name.trim().split(' ')[0] : 'Organizer';

  const readinessScore = useMemo(() => {
    let score = 0;
    if (metrics.registrations > 0) score += 25;
    if (metrics.teams > 0) score += 25;
    if (metrics.submissions > 0) score += 25;
    if (metrics.judging >= 100) score += 25;
    return score;
  }, [metrics]);

  const readinessChecks = [
    { label: 'Registrations received', done: metrics.registrations > 0 },
    { label: 'Teams formed', done: metrics.teams > 0 },
    { label: 'Submissions received', done: metrics.submissions > 0 },
    { label: 'Judging complete', done: metrics.judging >= 100 },
  ];

  const maxTrack = Math.max(1, ...topTracks.map((t) => t.count), 1);

  /* ---------- Render ---------- */
  return (
    <div className="relative min-h-screen">
      <GridBackground />

      <CommandKModal isOpen={commandKOpen} onClose={() => setCommandKOpen(false)} />
      <AssignJudgesModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
      />

      <DashboardShell
        role="organizer"
        userName={user.name}
        userEmail={user.email}
        eventName={eventName}
        navigation={organizerNavigation}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandKOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#FAF9F5] text-xs font-mono font-bold text-[#706F6B] transition-all shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Search</span>
              <kbd className="px-1.5 py-0.5 rounded border border-[#E6E5E0] text-[9px] bg-[#FAF9F5]">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#FAF9F5] text-xs font-mono font-bold text-[#0A0A0A] transition-all disabled:opacity-50"
            >
              {isRefreshing ? 'Syncing…' : 'Refresh'}
            </button>

            <button
              onClick={() => router.push('/dashboard/events/new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#0A0A0A] hover:bg-[#C6A24A] text-white shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <PlusIcon />
              New Event
            </button>
          </div>
        }
      >
        <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E6E5E0] pb-5">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C6A24A] font-bold">
                Command Center
                {eventId ? ` · ${eventId.slice(0, 8)}…` : ''}
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0A0A0A] tracking-tight mt-1">
                Welcome back, {firstName}
              </h1>
              <p className="text-xs text-[#706F6B] mt-1 font-sans">
                Live pulse for{' '}
                <span className="font-semibold text-[#0A0A0A]">{eventName}</span>
                {loading ? ' · loading metrics…' : ' · production data'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {currentTime && (
                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E6E5E0] bg-white font-mono text-[11px] text-[#2C2C2A] shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6A24A] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C6A24A]" />
                  </span>
                  {currentTime}
                </div>
              )}
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#FAF9F5] text-xs font-mono font-bold text-[#0A0A0A] transition-all disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Error / invalid id notice */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-mono text-red-700">
              {error}
            </div>
          )}
          {eventId && !isValidUUID(eventId) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-mono text-amber-900">
              Invalid event id in URL. Use a real event UUID from Supabase →{' '}
              <span className="font-bold">events.id</span>. Showing empty metrics.
            </div>
          )}
          {!eventId && (
            <div className="rounded-xl border border-[#E6E5E0] bg-[#FAF9F5] px-4 py-3 text-xs font-mono text-[#706F6B]">
              No event selected. Open an event dashboard from{' '}
              <button
                type="button"
                className="underline text-[#C6A24A] font-bold"
                onClick={() => router.push('/dashboard/events')}
              >
                Events
              </button>{' '}
              to load live metrics.
            </div>
          )}

          {/* Metric cards — REAL */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Registrations"
                value={loading ? '—' : metrics.registrations.toLocaleString()}
                delta={{
                  value: metrics.approved,
                  trend: metrics.approved > 0 ? 'up' : 'neutral',
                }}
                accent="primary"
                sparkline={[
                  0,
                  Math.max(1, Math.floor(metrics.registrations * 0.2)),
                  Math.max(1, Math.floor(metrics.registrations * 0.45)),
                  Math.max(1, Math.floor(metrics.registrations * 0.7)),
                  metrics.registrations || 1,
                ]}
                helper={
                  metrics.capacity != null
                    ? `${metrics.utilizationPercent ?? 0}% of ${metrics.capacity} capacity`
                    : `${metrics.approved} approved`
                }
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Teams Formed"
                value={loading ? '—' : metrics.teams.toLocaleString()}
                delta={{
                  value: metrics.soloLooking,
                  trend: metrics.soloLooking > 0 ? 'down' : 'neutral',
                }}
                accent="secondary"
                sparkline={[
                  0,
                  Math.max(1, Math.floor(metrics.teams * 0.3)),
                  Math.max(1, Math.floor(metrics.teams * 0.6)),
                  metrics.teams || 1,
                ]}
                helper={
                  metrics.soloLooking > 0
                    ? `${metrics.soloLooking} still looking`
                    : 'All matched or none yet'
                }
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Submissions"
                value={loading ? '—' : metrics.submissions.toLocaleString()}
                delta={{
                  value: metrics.drafts,
                  trend: 'neutral',
                }}
                accent="success"
                sparkline={[
                  0,
                  Math.max(1, Math.floor(metrics.submissions * 0.4)),
                  metrics.submissions || 1,
                ]}
                helper={`${metrics.drafts} drafts · ${metrics.completionPercent}% teams submitted`}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Judging Progress"
                value={loading ? '—' : `${metrics.judging}%`}
                delta={{ value: metrics.judging, trend: 'up' }}
                accent="warning"
                sparkline={[0, Math.floor(metrics.judging / 2), metrics.judging || 1]}
                helper={
                  metrics.judging === 0
                    ? 'No scores yet'
                    : `${metrics.judging}% of submitted work scored`
                }
              />
            </motion.div>
          </motion.div>

          {/* Registration health + readiness */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard
              title="Registration Health"
              eyebrow="Real-Time Streams"
              className="lg:col-span-2"
              actions={
                eventId ? (
                  <button
                    onClick={() => router.push(`/events/${eventId}/registrations`)}
                    className="text-xs font-mono font-bold text-[#C6A24A] hover:text-[#A07F32] transition-colors"
                  >
                    View Details →
                  </button>
                ) : null
              }
            >
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Approved',
                    value: metrics.approved,
                    color:
                      'border-emerald-100 text-emerald-800 bg-emerald-50/50',
                  },
                  {
                    label: 'Pending',
                    value: metrics.pending,
                    color: 'border-amber-100 text-amber-800 bg-amber-50/50',
                  },
                  {
                    label: 'Blocked',
                    value: metrics.blocked,
                    color: 'border-red-100 text-red-800 bg-red-50/50',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-lg border p-3 bg-white hover:shadow-sm transition-all ${s.color}`}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-wider font-bold opacity-80">
                      {s.label}
                    </span>
                    <p className="mt-1 font-serif text-xl font-black tabular-nums">
                      {loading ? '—' : s.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mt-6">
                <span className="font-mono text-[10px] text-[#706F6B] block uppercase tracking-wider">
                  Track Distribution
                </span>
                {topTracks.length === 0 ? (
                  <p className="text-xs text-[#706F6B] font-mono italic border border-dashed border-[#E6E5E0] rounded-lg p-4 text-center">
                    No registration tracks yet. When hackers register with a
                    track, distribution appears here.
                  </p>
                ) : (
                  topTracks.map((track, i) => {
                    const pct = (track.count / maxTrack) * 100;
                    return (
                      <div key={track.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#0A0A0A] font-medium">
                            {track.name}
                          </span>
                          <span className="text-[#706F6B]">
                            {track.count} applicants
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EFEA]">
                          <motion.div
                            className="h-full rounded-full bg-[#C6A24A]"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 1,
                              delay: i * 0.08,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>

            <SectionCard title="Publish Readiness" eyebrow="Gate Check">
              <div className="flex flex-col items-center py-1">
                <ProgressRing
                  value={readinessScore}
                  label={`${readinessScore}%`}
                  sublabel="Launch Ready"
                />

                <div className="mt-5 w-full space-y-2 border-t border-[#F0EFEA] pt-4">
                  {readinessChecks.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center gap-2.5 text-xs text-[#2C2C2A]"
                    >
                      <span
                        className={
                          c.done
                            ? 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#F7F3E3] text-[#A07F32] font-bold text-[10px]'
                            : 'flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[#E6E5E0] text-[#706F6B] text-[10px]'
                        }
                      >
                        {c.done ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          c.done
                            ? 'text-[#0A0A0A] font-medium'
                            : 'text-[#706F6B]'
                        }
                      >
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Activity + briefing */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard
              title="Live Event Activity"
              eyebrow="Audit Stream"
              actions={
                <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-lg border border-[#E6E5E0]">
                  {(['all', 'submission', 'score', 'team'] as const).map(
                    (filter) => (
                      <button
                        key={filter}
                        onClick={() => setFeedFilter(filter)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold capitalize transition-all ${
                          feedFilter === filter
                            ? 'bg-[#0A0A0A] text-white'
                            : 'text-[#706F6B] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {filter}
                      </button>
                    )
                  )}
                </div>
              }
            >
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <p className="text-xs text-[#706F6B] font-mono italic border border-dashed border-[#E6E5E0] rounded-lg p-6 text-center">
                    No audit activity yet. Approvals, locks, and scores will
                    stream here automatically.
                  </p>
                ) : (
                  filteredActivities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-[#FAF9F5] border border-transparent hover:border-[#E6E5E0] transition-all duration-200"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#F7F3E3] text-[#A07F32]">
                        <ActivityIcon type={a.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-serif font-bold text-[#0A0A0A]">
                          {a.title}
                        </p>
                        <p className="truncate text-xs text-[#706F6B] mt-0.5">
                          {a.desc}
                        </p>
                      </div>
                      <span className="flex-shrink-0 font-mono text-[9px] text-[#706F6B]">
                        {a.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {eventId && (
                <button
                  onClick={() => router.push(`/events/${eventId}/audit-log`)}
                  className="mt-3 text-[10px] font-mono font-bold text-[#C6A24A] hover:text-[#A07F32]"
                >
                  Open full audit log →
                </button>
              )}
            </SectionCard>

            <SectionCard
              title="Intelligence Briefing"
              eyebrow="Ops Insight"
              actions={
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="text-[10px] font-mono font-bold bg-[#FAF9F5] hover:bg-[#F7F3E3] text-[#706F6B] hover:text-[#A07F32] px-2.5 py-1 rounded-md border border-[#E6E5E0] hover:border-[#C6A24A]/40 transition-all"
                >
                  Assign Judges
                </button>
              }
            >
              <div className="relative overflow-hidden rounded-xl border border-[#E6E5E0] bg-white p-4">
                <div className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-b from-[#C6A24A] to-[#A07F32]" />
                <div className="flex items-start gap-3 pl-1">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#C6A24A]">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs leading-relaxed text-[#2C2C2A] font-serif">
                      {metrics.registrations === 0 && metrics.teams === 0 ? (
                        <>
                          No live traffic yet. Share the public hackathon page
                          and open registrations to start filling this console.
                        </>
                      ) : metrics.soloLooking > 0 ? (
                        <>
                          <strong className="text-[#C6A24A] font-bold">
                            {metrics.soloLooking}
                          </strong>{' '}
                          hacker{metrics.soloLooking === 1 ? '' : 's'} still in
                          the looking-for-team pool across{' '}
                          <strong>{metrics.teams}</strong> teams. Consider
                          matchmaking before submissions lock.
                        </>
                      ) : metrics.submissions === 0 ? (
                        <>
                          Roster is live (
                          <strong>{metrics.registrations}</strong> regs ·{' '}
                          <strong>{metrics.teams}</strong> teams). Waiting on
                          first project submissions.
                        </>
                      ) : metrics.judging < 100 ? (
                        <>
                          <strong>{metrics.submissions}</strong> submission
                          package{metrics.submissions === 1 ? '' : 's'} in
                          pipeline. Judging at{' '}
                          <strong className="text-[#C6A24A]">
                            {metrics.judging}%
                          </strong>
                          . Assign judges to clear the queue.
                        </>
                      ) : (
                        <>
                          Core gates look healthy. Review results and publish
                          when conflict checks are clear.
                        </>
                      )}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setAssignModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-[#C6A24A] text-white text-[10px] font-mono font-bold transition-all shadow-sm"
                      >
                        Assign Judges
                      </button>
                      {eventId && (
                        <button
                          onClick={() =>
                            router.push(`/events/${eventId}/teams`)
                          }
                          className="px-3 py-1.5 rounded-lg border border-[#E6E5E0] hover:bg-[#FAF9F5] text-[10px] font-mono font-bold text-[#706F6B] transition-all"
                        >
                          View Teams
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}

/* ==========================================================================
   ICONS
   ========================================================================== */

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

function ActivityIcon({
  type,
}: {
  type: 'submission' | 'score' | 'team' | 'verified';
}) {
  switch (type) {
    case 'submission':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 2h5l3 3v7H3V2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'score':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 2l1.2 2.4L11 5l-2 2 .5 2.8L7 8.8 4.5 9.8 5 7 3 5l2.8-.6L7 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'team':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M2 12c0-1.7 1.3-3 3-3s3 1.3 3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'verified':
    default:
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 7l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}