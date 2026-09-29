'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { GridBackground } from '@/components/dashboard/GridBackground';
import { organizerNavigation } from '@/components/layout/navigation';
import { getAuthSession, type UserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

export type SubmissionStatus = 'draft' | 'submitted' | 'locked' | 'final';

export interface FormattedSubmission {
  id: string;
  projectName: string;
  teamName: string;
  track: string;
  status: SubmissionStatus;
  githubUrl: string | null;
  demoUrl: string | null;
  submittedAt: string;
  updatedAt: string;
}

interface Props {
  eventId: string;
  initialSubmissions: FormattedSubmission[];
}

export function SubmissionsClient({ eventId, initialSubmissions = [] }: Props) {
  const [user, setUser] = useState<UserProfile>({
    name: 'Organizer',
    email: 'organizer@platform.com',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const [submissions, setSubmissions] = useState<FormattedSubmission[]>(initialSubmissions);
  const [isExporting, setIsExporting] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const session = getAuthSession();
    if (session?.name) setUser(session);
  }, []);

  const filtered = submissions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.projectName.toLowerCase().includes(q) ||
      s.teamName.toLowerCase().includes(q) ||
      s.track.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: submissions.length,
    draft: submissions.filter((s) => s.status === 'draft').length,
    submitted: submissions.filter((s) => s.status === 'submitted').length,
    locked: submissions.filter((s) => s.status === 'locked').length,
    final: submissions.filter((s) => s.status === 'final').length,
  };

  const handleLock = async (id: string) => {
    const prev = [...submissions];
    setLockingId(id);
    setSubmissions((list) =>
      list.map((s) => (s.id === id ? { ...s, status: 'locked' as const } : s))
    );

    const { error } = await supabase
      .from('submissions')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('event_id', eventId);

    if (error) {
      console.error(error);
      setSubmissions(prev);
      alert('Failed to lock submission. Reverted.');
    } else {
      await supabase.from('audit_log').insert({
        event_id: eventId,
        action: 'LOCK_SUBMISSION',
        entity_type: 'submission',
        entity_id: id,
        payload: { status: 'locked' },
      });
    }
    setLockingId(null);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    const headers = [
      'Submission ID',
      'Project',
      'Team',
      'Track',
      'Status',
      'GitHub',
      'Demo',
      'Submitted At',
    ];
    const rows = submissions.map((s) =>
      [
        s.id,
        `"${s.projectName}"`,
        `"${s.teamName}"`,
        `"${s.track}"`,
        s.status,
        s.githubUrl || '',
        s.demoUrl || '',
        `"${s.submittedAt}"`,
      ].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `submissions_${eventId}.csv`;
    link.click();
    setIsExporting(false);
  };

  const statusStyles = (status: SubmissionStatus) => {
    switch (status) {
      case 'submitted':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'locked':
        return 'bg-[#0A0A0A] border-[#0A0A0A] text-[#C6A24A]';
      case 'final':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'draft':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-800';
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
                Submissions
              </h1>
              <p className="text-xs text-[#706F6B] mt-1 font-sans">
                Review project submissions, lock entries, and export the pipeline.
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={isExporting || submissions.length === 0}
              className="px-3.5 py-1.5 rounded-lg border border-[#E6E5E0] bg-[#0A0A0A] hover:bg-[#C6A24A] text-white text-xs font-mono font-bold transition-all shadow-sm disabled:opacity-70 disabled:hover:bg-[#0A0A0A]"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E6E5E0] shadow-sm">
            <div className="relative w-full sm:w-80">
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
                placeholder="Search project, team, or track..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E6E5E0] bg-[#FAF9F5] text-xs text-[#0A0A0A] placeholder:text-[#706F6B] focus:outline-none focus:border-[#C6A24A] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto hide-scrollbar">
              {(['all', 'draft', 'submitted', 'locked', 'final'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    statusFilter === status
                      ? 'bg-[#0A0A0A] text-white shadow-sm'
                      : 'bg-white border border-[#E6E5E0] text-[#706F6B] hover:border-[#C6A24A]/50 hover:text-[#0A0A0A]'
                  }`}
                >
                  {capitalize(status)}
                  <span className="ml-1.5 opacity-60">{counts[status]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EFEA] bg-[#FAF9F5]">
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                      Project / Team
                    </th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                      Links
                    </th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">
                      Submitted
                    </th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA]">
                  <AnimatePresence>
                    {filtered.length > 0 ? (
                      filtered.map((sub, i) => (
                        <motion.tr
                          key={sub.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          className="group hover:bg-[#FAF9F5] transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-[#0A0A0A] text-[#C6A24A] flex items-center justify-center font-serif font-bold text-sm shadow-sm">
                                {sub.projectName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-serif font-bold text-sm text-[#0A0A0A] group-hover:text-[#C6A24A] transition-colors">
                                  {sub.projectName}
                                </p>
                                <p className="font-sans text-[11px] text-[#706F6B]">{sub.teamName}</p>
                                <p className="font-mono text-[9px] text-[#A07F32] mt-0.5">{sub.track}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              {sub.githubUrl ? (
                                <a
                                  href={sub.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[10px] text-[#0A0A0A] hover:text-[#C6A24A] underline-offset-2 hover:underline truncate max-w-[180px]"
                                >
                                  GitHub ↗
                                </a>
                              ) : (
                                <span className="font-mono text-[10px] text-[#706F6B]">No repo</span>
                              )}
                              {sub.demoUrl ? (
                                <a
                                  href={sub.demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[10px] text-[#0A0A0A] hover:text-[#C6A24A] underline-offset-2 hover:underline truncate max-w-[180px]"
                                >
                                  Demo ↗
                                </a>
                              ) : (
                                <span className="font-mono text-[10px] text-[#706F6B]">No demo</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${statusStyles(
                                sub.status
                              )}`}
                            >
                              {sub.status === 'draft' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              )}
                              {capitalize(sub.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono text-[10px] text-[#706F6B]">
                            {sub.submittedAt}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {sub.status === 'submitted' && (
                                <button
                                  onClick={() => handleLock(sub.id)}
                                  disabled={lockingId === sub.id}
                                  className="px-2.5 py-1 rounded border border-[#E6E5E0] bg-[#0A0A0A] text-[10px] font-mono font-bold text-white hover:bg-[#C6A24A] disabled:opacity-60"
                                >
                                  {lockingId === sub.id ? 'Locking…' : 'Lock'}
                                </button>
                              )}
                              <button className="px-2 py-1 rounded border border-[#E6E5E0] bg-white text-[10px] font-mono font-bold text-[#0A0A0A] hover:bg-[#FAF9F5] shadow-sm">
                                View
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#E6E5E0] bg-white flex items-center justify-center mb-4 text-[#C6A24A]">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            </div>
                            <h3 className="font-serif text-xl font-bold text-[#0A0A0A]">
                              No submissions yet
                            </h3>
                            <p className="text-sm text-[#706F6B] mt-2 max-w-sm">
                              {submissions.length === 0
                                ? 'When teams submit projects, they will appear here in real time.'
                                : 'No submissions match your current filter or search.'}
                            </p>
                            {submissions.length > 0 && (
                              <button
                                onClick={() => {
                                  setSearchQuery('');
                                  setStatusFilter('all');
                                }}
                                className="mt-6 px-4 py-2 rounded-lg bg-[#0A0A0A] text-xs font-mono font-bold text-white hover:bg-[#C6A24A] transition-all"
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}