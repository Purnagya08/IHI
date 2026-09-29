'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { GridBackground } from '@/components/dashboard/GridBackground';
import { organizerNavigation } from '@/components/layout/navigation';
import { getAuthSession, type UserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

/* ==========================================================================
   TYPES & HELPERS
   ========================================================================== */

interface AuditLogItem {
  id: string;
  event_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

type Severity = 'info' | 'success' | 'warning' | 'critical';
type ViewMode = 'timeline' | 'table';
type EntityFilter = 'all' | 'registration' | 'team' | 'submission' | 'score' | 'event' | 'correction_request';

const isValidUUID = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function getSeverity(log: AuditLogItem): Severity {
  const action = (log.action || '').toUpperCase();
  const entity = (log.entity_type || '').toLowerCase();

  if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('BLOCK') || action.includes('REJECT')) {
    return 'critical';
  }
  if (action.includes('PUBLISH') || action.includes('APPROVE') || action.includes('SUBMIT') || action.includes('SCORE')) {
    return 'success';
  }
  if (action.includes('CORRECTION') || action.includes('LOCK') || action.includes('WARN') || entity === 'correction_request' || action.includes('WAITLIST')) {
    return 'warning';
  }
  return 'info';
}

function formatActor(actorId: string | null): string {
  if (!actorId) return 'System';
  return `${actorId.slice(0, 8)}…`;
}

function formatEntityId(id: string | null): string {
  if (!id) return '';
  return `${id.slice(0, 8)}…`;
}

function prettyPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload ?? {}, null, 2);
  } catch {
    return String(payload ?? '');
  }
}

function humanAction(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ==========================================================================
   PAGE COMPONENT
   ========================================================================== */

export default function AuditLogPage() {
  const params = useParams();
  const eventId = (params.eventId as string) || (params.id as string);

  const [user, setUser] = useState<UserProfile>({
    name: 'Organizer',
    email: 'organizer@platform.com',
  });
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const session = getAuthSession();
    if (session?.name) setUser(session);
  }, []);

  /* ---------- LOAD REAL DATA FROM SUPABASE ---------- */
  const load = useCallback(async () => {
    if (!eventId) return;

    // CRASH PREVENTION: If URL has '1' instead of a UUID, fail gracefully
    if (!isValidUUID(eventId)) {
      console.warn(`Invalid UUID provided in URL: ${eventId}. Skipping database query.`);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        console.error('Audit log query error:', dbError.message, dbError.details);
        setError('Failed to load audit log.');
        setLogs([]);
      } else {
        setLogs((data as AuditLogItem[]) || []);
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading audit log.');
    } finally {
      setLoading(false);
    }
  }, [eventId, entityFilter, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- FILTERS ---------- */
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const hay = [
        log.action,
        log.entity_type,
        log.entity_id,
        log.actor_id,
        JSON.stringify(log.payload || {}),
        log.created_at,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [logs, searchQuery]);

  /* ---------- COUNTS PER FILTER ---------- */
  const counts = useMemo(() => {
    return {
      all: logs.length,
      registration: logs.filter((l) => l.entity_type === 'registration').length,
      team: logs.filter((l) => l.entity_type === 'team').length,
      submission: logs.filter((l) => l.entity_type === 'submission').length,
      score: logs.filter((l) => l.entity_type === 'score').length,
      event: logs.filter((l) => l.entity_type === 'event').length,
      correction_request: logs.filter((l) => l.entity_type === 'correction_request').length,
    };
  }, [logs]);

  /* ---------- CSV EXPORT ---------- */
  const handleExportCSV = () => {
    setIsExporting(true);
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor ID', 'Payload'];
    const rows = filteredLogs.map((log) =>
      [
        new Date(log.created_at).toISOString(),
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.actor_id || 'System',
        `"${JSON.stringify(log.payload || {}).replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${eventId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setIsExporting(false);
  };

  /* ---------- STYLES ---------- */
  const getSeverityStyles = (severity: Severity) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'info':
      default:
        return 'bg-[#FAF9F5] border-[#E6E5E0] text-[#706F6B]';
    }
  };

  const getDotColor = (severity: Severity) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'critical':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-[#C6A24A]';
    }
  };

  const entityFilters: { key: EntityFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'registration', label: 'Registration' },
    { key: 'team', label: 'Team' },
    { key: 'submission', label: 'Submission' },
    { key: 'score', label: 'Score' },
    { key: 'event', label: 'Event' },
  ];

  return (
    <div className="relative min-h-screen bg-[#F9F9F6]">
      <GridBackground />

      <DashboardShell
        role="organizer"
        userName={user.name}
        userEmail={user.email}
        eventName={user.eventName || 'Live Event Console'}
        navigation={organizerNavigation}
      >
        <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E6E5E0] pb-5">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C6A24A] font-bold">
                Event ID: {eventId}
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0A0A0A] tracking-tight mt-1">
                Audit Log
              </h1>
              <p className="text-xs text-[#706F6B] mt-1 font-sans">
                Immutable record of every action. Read-only for security &amp; compliance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={load}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg border border-[#E6E5E0] bg-white hover:bg-[#FAF9F5] text-xs font-mono font-bold text-[#0A0A0A] transition-all disabled:opacity-70 flex items-center gap-1.5"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={loading ? 'animate-spin' : ''}
                >
                  <path
                    d="M12.25 7a5.25 5.25 0 11-1.54-3.71L12.25 5M12.25 1.75V5h-3.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting || filteredLogs.length === 0}
                className="px-3.5 py-1.5 rounded-lg border border-[#E6E5E0] bg-[#0A0A0A] hover:bg-[#C6A24A] text-white text-xs font-mono font-bold transition-all shadow-sm disabled:opacity-70 disabled:hover:bg-[#0A0A0A]"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-600 flex-shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.5v4.5M8 11.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-xs font-mono text-red-700">{error}</p>
            </div>
          )}

          {/* Controls: Search + Filters + View Toggle */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E6E5E0] shadow-sm">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#706F6B]"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search actions, actors, entity IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E6E5E0] bg-[#FAF9F5] text-xs text-[#0A0A0A] placeholder:text-[#706F6B] focus:outline-none focus:border-[#C6A24A] transition-colors"
              />
            </div>

            {/* Entity Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto hide-scrollbar">
              {entityFilters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setEntityFilter(key)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    entityFilter === key
                      ? 'bg-[#0A0A0A] text-white shadow-sm'
                      : 'bg-white border border-[#E6E5E0] text-[#706F6B] hover:border-[#C6A24A]/50 hover:text-[#0A0A0A]'
                  }`}
                >
                  {label}
                  <span className="ml-1.5 opacity-60">{counts[key]}</span>
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5E0]">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#0A0A0A] shadow-sm border border-[#E6E5E0]'
                    : 'text-[#706F6B] hover:text-[#0A0A0A]'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0A0A0A] shadow-sm border border-[#E6E5E0]'
                    : 'text-[#706F6B] hover:text-[#0A0A0A]'
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {/* Meta line */}
          <p className="font-mono text-[10px] text-[#706F6B] px-1 -mt-2">
            Showing {filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}
            {entityFilter !== 'all' ? ` · filter: ${entityFilter}` : ''}
            {searchQuery.trim() ? ` · search: "${searchQuery.trim()}"` : ''} · read-only
          </p>

          {/* ============================= CONTENT ============================= */}

          {loading ? (
            <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm py-24 flex flex-col items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#E6E5E0] border-t-[#C6A24A] animate-spin mb-4" />
              <p className="text-xs font-mono text-[#706F6B]">Loading audit log...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            /* --------- EMPTY STATE (matches other pages) --------- */
            <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#E6E5E0] bg-white flex items-center justify-center mb-4 text-[#C6A24A]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#0A0A0A]">No audit records yet</h3>
              <p className="text-sm text-[#706F6B] mt-2 max-w-sm">
                {logs.length === 0
                  ? 'Every organizer action (approvals, locks, publishes) will be permanently logged here.'
                  : 'No audit entries match your current filter or search.'}
              </p>
              {logs.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setEntityFilter('all');
                  }}
                  className="mt-6 px-4 py-2 rounded-lg bg-[#0A0A0A] border border-[#0A0A0A] text-xs font-mono font-bold text-white hover:bg-[#C6A24A] hover:border-[#C6A24A] transition-all"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'timeline' ? (
            /* --------- TIMELINE VIEW --------- */
            <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm p-6 md:p-8">
              <div className="relative pl-8">
                {/* Vertical spine */}
                <div className="absolute left-[11px] top-2 bottom-0 w-px bg-[#E6E5E0]" />

                <div className="space-y-6">
                  <AnimatePresence>
                    {filteredLogs.map((log, index) => {
                      const severity = getSeverity(log);
                      const isExpanded = expandedId === log.id;

                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                          className="relative"
                        >
                          {/* Dot */}
                          <div className="absolute -left-8 top-2 z-10">
                            <div className="h-4 w-4 rounded-full bg-white border-2 border-[#E6E5E0] flex items-center justify-center">
                              <div className={`h-1.5 w-1.5 rounded-full ${getDotColor(severity)}`} />
                            </div>
                          </div>

                          {/* Card */}
                          <div className="bg-[#FAF9F5] border border-[#E6E5E0] rounded-lg p-4 hover:border-[#C6A24A]/40 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Row: Action + Entity Badge + Time */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getSeverityStyles(
                                      severity
                                    )}`}
                                  >
                                    {humanAction(log.action)}
                                  </span>
                                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#A07F32] font-bold">
                                    {log.entity_type}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#706F6B]">
                                    {new Date(log.created_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#706F6B]">
                                  {log.entity_id && (
                                    <span>
                                      <span className="opacity-60">entity:</span>{' '}
                                      <span className="text-[#0A0A0A]">{formatEntityId(log.entity_id)}</span>
                                    </span>
                                  )}
                                  <span>
                                    <span className="opacity-60">actor:</span>{' '}
                                    <span className="text-[#0A0A0A]">{formatActor(log.actor_id)}</span>
                                  </span>
                                </div>

                                {/* Toggle Payload */}
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                  className="mt-2 text-[10px] font-mono font-bold text-[#C6A24A] hover:text-[#A07F32] transition-colors"
                                >
                                  {isExpanded ? '− Hide payload' : '+ View payload'}
                                </button>

                                {isExpanded && (
                                  <pre className="mt-3 p-3 rounded-md bg-white border border-[#E6E5E0] text-[10px] font-mono text-[#2C2C2A] overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                                    {prettyPayload(log.payload)}
                                  </pre>
                                )}
                              </div>

                              {/* Record ID pill */}
                              <div className="md:w-40 flex-shrink-0">
                                <div className="rounded-md bg-white border border-[#E6E5E0] px-3 py-2">
                                  <p className="text-[8px] font-mono uppercase tracking-widest text-[#706F6B] mb-0.5">
                                    Record ID
                                  </p>
                                  <p className="font-mono text-[10px] text-[#0A0A0A] break-all">
                                    {log.id.slice(0, 14)}…
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            /* --------- TABLE VIEW --------- */
            <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0EFEA] bg-[#FAF9F5]">
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                        When
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                        Action
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                        Entity
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                        Actor
                      </th>
                      <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                        Payload
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA]">
                    <AnimatePresence>
                      {filteredLogs.map((log, i) => {
                        const severity = getSeverity(log);
                        const isExpanded = expandedId === log.id;

                        return (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.01 }}
                            className="group hover:bg-[#FAF9F5] transition-colors"
                          >
                            <td className="px-5 py-3 font-mono text-[10px] text-[#706F6B] whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityStyles(
                                  severity
                                )}`}
                              >
                                {humanAction(log.action)}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-mono text-[10px] text-[#706F6B]">
                              <span className="text-[#0A0A0A] font-bold">{log.entity_type}</span>
                              {log.entity_id && (
                                <span className="text-[#706F6B]"> · {formatEntityId(log.entity_id)}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 font-mono text-[10px] text-[#706F6B]">
                              {formatActor(log.actor_id)}
                            </td>
                            <td className="px-5 py-3 max-w-[280px]">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                className="block w-full text-left font-mono text-[10px] text-[#706F6B] truncate hover:text-[#0A0A0A] transition-colors"
                                title="Click to expand"
                              >
                                {JSON.stringify(log.payload || {})}
                              </button>
                              {isExpanded && (
                                <pre className="mt-2 p-2 rounded bg-[#FAF9F5] border border-[#E6E5E0] text-[10px] font-mono text-[#2C2C2A] overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                  {prettyPayload(log.payload)}
                                </pre>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </div>
  );
}