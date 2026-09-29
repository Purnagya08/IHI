'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { GridBackground } from '@/components/dashboard/GridBackground';
import { getOrganizerNavigation } from '@/components/layout/navigation';
import { getAuthSession, type UserProfile } from '@/lib/auth';

export function EventSectionPlaceholder({
  eventId,
  title,
  eyebrow,
  description,
}: {
  eventId: string;
  title: string;
  eyebrow: string;
  description: string;
}) {
  const [user, setUser] = useState<UserProfile>({
    name: 'Organizer',
    email: 'organizer@platform.com',
  });

  useEffect(() => {
    const session = getAuthSession();
    if (session?.name) setUser(session);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F9F9F6]">
      <GridBackground />
      <DashboardShell
        role="organizer"
        userName={user.name}
        userEmail={user.email}
        eventName={user.eventName || 'Live Event Console'}
        navigation={getOrganizerNavigation(eventId)}
      >
        <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E6E5E0] pb-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#C6A24A] font-bold">
              {eyebrow} · Event {eventId}
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0A0A0A] tracking-tight mt-1">
              {title}
            </h1>
            <p className="text-xs text-[#706F6B] mt-1">{description}</p>
          </div>

          <div className="rounded-xl border border-[#E6E5E0] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E6E5E0] bg-[#FAF9F5] text-[#C6A24A]">
              <span className="font-serif text-lg font-bold">IHI</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-[#0A0A0A]">
              {title} module is connected
            </h2>
            <p className="mt-2 text-xs text-[#706F6B] max-w-md mx-auto">
              This route is live inside the Organizer shell.
            </p>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
}