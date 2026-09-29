'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { GridBackground } from '@/components/dashboard/GridBackground';
import { organizerNavigation } from '@/components/layout/navigation';
import { getAuthSession, type UserProfile } from '@/lib/auth';

export type TeamHealth = 'Full' | 'Needs Members' | 'At Risk';

export interface FormattedTeam {
  id: string;
  name: string;
  lead: string;
  track: string;
  members: number;
  capacity: number;
  health: TeamHealth;
  created: string;
}

interface Props {
  eventId: string;
  initialTeams: FormattedTeam[];
}

export function TeamsClient({ eventId, initialTeams = [] }: Props) {
  const [user, setUser] = useState<UserProfile>({ name: 'Organizer', email: 'organizer@platform.com' });
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<'All' | TeamHealth>('All');
  const [teams, setTeams] = useState<FormattedTeam[]>(initialTeams);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    if (session && session.name) setUser(session);
  }, []);

  // Filter Logic
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          team.lead.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = healthFilter === 'All' || team.health === healthFilter;
    return matchesSearch && matchesHealth;
  });

  const handleExportCSV = () => {
    setIsExporting(true);
    const headers = ['Team ID', 'Team Name', 'Lead', 'Track', 'Members', 'Capacity', 'Health Status', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...teams.map(t => `"${t.id}","${t.name}","${t.lead}","${t.track}",${t.members},${t.capacity},"${t.health}","${t.created}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `teams_export_${eventId}.csv`;
    link.click();

    setIsExporting(false);
  };

  const getHealthStyles = (health: TeamHealth) => {
    switch (health) {
      case 'Full': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'Needs Members': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'At Risk': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-[#FAF9F5] border-[#E6E5E0] text-[#706F6B]';
    }
  };

  // Stats computed from real Supabase data
  const totalTeams = teams.length;
  const fullTeams = teams.filter(t => t.health === 'Full').length;
  const lookingForMembers = teams.filter(t => t.health === 'Needs Members' || t.health === 'At Risk').length;

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
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E6E5E0] pb-5">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C6A24A] font-bold">
                Event ID: {eventId}
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0A0A0A] tracking-tight mt-1">
                Team Oversight
              </h1>
              <p className="text-xs text-[#706F6B] mt-1 font-sans">
                Monitor team formation health, manage capacities, and track registered teams in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                disabled={isExporting || teams.length === 0}
                className="px-3.5 py-1.5 rounded-lg border border-[#E6E5E0] bg-[#0A0A0A] hover:bg-[#C6A24A] text-white text-xs font-mono font-bold transition-all shadow-sm disabled:opacity-70 disabled:hover:bg-[#0A0A0A]"
              >
                {isExporting ? 'Exporting...' : 'Export Teams CSV'}
              </button>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E6E5E0] shadow-sm">
            
            {/* Real Stats */}
            <div className="flex items-center gap-6 px-2">
              <div>
                <p className="text-[10px] font-mono text-[#706F6B] uppercase">Total Teams</p>
                <p className="font-serif text-xl font-bold text-[#0A0A0A]">{totalTeams}</p>
              </div>
              <div className="w-px h-8 bg-[#F0EFEA]" />
              <div>
                <p className="text-[10px] font-mono text-[#706F6B] uppercase">Full Capacity</p>
                <p className="font-serif text-xl font-bold text-emerald-700">{fullTeams}</p>
              </div>
              <div className="w-px h-8 bg-[#F0EFEA]" />
              <div>
                <p className="text-[10px] font-mono text-[#706F6B] uppercase">Looking for Members</p>
                <p className="font-serif text-xl font-bold text-amber-600">{lookingForMembers}</p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-10 bg-[#E6E5E0]" />

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#706F6B]" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search team or lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E6E5E0] bg-[#FAF9F5] text-xs text-[#0A0A0A] placeholder:text-[#706F6B] focus:outline-none focus:border-[#C6A24A] transition-colors"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto hide-scrollbar">
                {(['All', 'Full', 'Needs Members', 'At Risk'] as const).map((health) => (
                  <button
                    key={health}
                    onClick={() => setHealthFilter(health)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      healthFilter === health
                        ? 'bg-[#0A0A0A] text-white shadow-sm'
                        : 'bg-white border border-[#E6E5E0] text-[#706F6B] hover:border-[#C6A24A]/50 hover:text-[#0A0A0A]'
                    }`}
                  >
                    {health}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-[#E6E5E0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EFEA] bg-[#FAF9F5]">
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">Team Name</th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">Team Lead</th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">Members / Capacity</th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B]">Formation Health</th>
                    <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#706F6B] text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA]">
                  <AnimatePresence>
                    {filteredTeams.length > 0 ? (
                      filteredTeams.map((team, i) => (
                        <motion.tr 
                          key={team.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          className="group hover:bg-[#FAF9F5] transition-colors"
                        >
                          {/* Team Info */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg border border-[#E6E5E0] bg-white flex items-center justify-center shadow-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C6A24A]">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                              </div>
                              <div>
                                <p className="font-serif font-bold text-sm text-[#0A0A0A] group-hover:text-[#C6A24A] transition-colors">{team.name}</p>
                                <p className="font-mono text-[9px] text-[#706F6B] mt-0.5">{team.track}</p>
                              </div>
                            </div>
                          </td>

                          {/* Lead */}
                          <td className="px-5 py-4 font-sans text-xs text-[#2C2C2A] font-medium">
                            {team.lead}
                          </td>

                          {/* Members / Capacity */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-[#0A0A0A]">
                                {team.members} <span className="text-[#706F6B] font-normal">/ {team.capacity}</span>
                              </span>
                              <div className="flex -space-x-2">
                                {Array.from({ length: team.capacity }).map((_, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`h-6 w-6 rounded-full border-2 border-white ${idx < team.members ? 'bg-[#0A0A0A]' : 'bg-[#F0EFEA] border-dashed'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Health Badge */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${getHealthStyles(team.health)}`}>
                              {team.health === 'Full' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                              {team.health === 'Needs Members' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                              {team.health === 'At Risk' && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                              {team.health}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="px-5 py-4 text-right font-mono text-[10px] text-[#706F6B]">
                            {team.created}
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      // Blueprint Empty State
                      <tr>
                        <td colSpan={5}>
                          <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#E6E5E0] bg-white flex items-center justify-center mb-4 text-[#C6A24A]">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <h3 className="font-serif text-xl font-bold text-[#0A0A0A]">No teams formed yet</h3>
                            <p className="text-sm text-[#706F6B] mt-2 max-w-sm">
                              {teams.length === 0 
                                ? "No teams have been created for this event yet. Once participants start forming teams, they will appear here."
                                : "No teams match your current filter or search criteria."}
                            </p>
                            {teams.length > 0 && (
                              <button 
                                onClick={() => {setSearchQuery(''); setHealthFilter('All');}}
                                className="mt-6 px-4 py-2 rounded-lg bg-[#0A0A0A] border border-[#0A0A0A] text-xs font-mono font-bold text-white hover:bg-[#C6A24A] hover:border-[#C6A24A] transition-all"
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