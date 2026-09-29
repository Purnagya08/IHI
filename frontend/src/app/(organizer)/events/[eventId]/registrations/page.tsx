import { createClient } from '@/lib/supabase/server';
import { RegistrationsClient } from '@/components/events/RegistrationsClient';

export const metadata = {
  title: 'Registrations | IHI Console',
};

// Helper to check if a string is a valid UUID
const isValidUUID = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId;

  // 1. Crash prevention: If URL has '1' instead of a UUID, show empty state gracefully
  if (!isValidUUID(eventId)) {
    console.warn(`Invalid UUID provided in URL: ${eventId}`);
    return <RegistrationsClient eventId={eventId} initialRegistrations={[]} />;
  }

  const supabase = await createClient();

  // 2. Fetch Real Data from Supabase
  const { data: registrations, error } = await supabase
    .from('registrations')
    .select(`
      id,
      display_name,
      skills,
      status,
      track,
      created_at,
      users ( email )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    // Better error logging so we know EXACTLY what Postgres is complaining about
    console.error('Supabase Error:', error.message, error.details);
  }

  // 3. Format it securely for the Client Component
  const formattedRegistrations = (registrations || []).map((reg: any) => ({
    id: reg.id,
    name: reg.display_name,
    email: reg.users?.email || 'No email provided',
    track: reg.track || 'General',
    skills: reg.skills || [],
    status: reg.status,
    appliedDate: new Date(reg.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
  }));

  return (
    <RegistrationsClient 
      eventId={eventId} 
      initialRegistrations={formattedRegistrations} 
    />
  );
}