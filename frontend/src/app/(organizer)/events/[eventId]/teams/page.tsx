import { createClient } from '@/lib/supabase/server';
import { TeamsClient, type FormattedTeam } from '@/components/events/TeamsClient';

export const metadata = {
  title: 'Team Formation Oversight | IHI Console',
};

const isValidUUID = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId;

  // Crash Prevention: If URL contains non-UUID like '1', fail gracefully
  if (!isValidUUID(eventId)) {
    console.warn(`Invalid UUID provided in URL: ${eventId}`);
    return <TeamsClient eventId={eventId} initialTeams={[]} />;
  }

  const supabase = await createClient();

  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      track,
      status,
      is_locked,
      max_size,
      max_members,
      created_at,
      lead_user_id,
      users!teams_lead_user_id_fkey ( name, email ),
      team_members ( id, user_id, role )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teams:', error.message, error.details);
  }

  const formattedTeams: FormattedTeam[] = (teams || []).map((t: any) => {
    const memberCount = t.team_members?.length || 0;
    const capacity = t.max_size || t.max_members || 4;
    const isLocked = t.is_locked || t.status === 'full';

    let health: 'Full' | 'Needs Members' | 'At Risk' = 'Needs Members';
    if (memberCount >= capacity || isLocked) {
      health = 'Full';
    } else if (memberCount <= 1) {
      health = 'At Risk';
    }

    const leadName = t.users?.name || (t.users?.email ? t.users.email.split('@')[0] : 'Unassigned');

    return {
      id: t.id,
      name: t.name,
      lead: leadName,
      track: t.track || 'General',
      members: memberCount,
      capacity: capacity,
      health: health,
      created: new Date(t.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    };
  });

  return (
    <TeamsClient 
      eventId={eventId} 
      initialTeams={formattedTeams} 
    />
  );
}