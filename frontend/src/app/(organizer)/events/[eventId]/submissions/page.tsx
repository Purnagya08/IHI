import { createClient } from '@/lib/supabase/server';
import { SubmissionsClient, type FormattedSubmission } from '@/components/events/SubmissionsClient';

export const metadata = {
  title: 'Submissions | IHI Console',
};

const isValidUUID = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId;

  // Crash Prevention: If URL contains non-UUID like '1', fail gracefully
  if (!isValidUUID(eventId)) {
    console.warn(`Invalid UUID provided in URL: ${eventId}`);
    return <SubmissionsClient eventId={eventId} initialSubmissions={[]} />;
  }

  const supabase = await createClient();

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      id,
      status,
      fields,
      submitted_at,
      locked_at,
      created_at,
      updated_at,
      team_id,
      teams (
        id,
        name,
        track
      )
    `)
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching submissions:', error.message, error.details);
  }

  const formatted: FormattedSubmission[] = (submissions || []).map((s: any) => {
    const fields = (s.fields || {}) as Record<string, unknown>;
    const projectName =
      (typeof fields.title === 'string' && fields.title) ||
      (typeof fields.project_name === 'string' && fields.project_name) ||
      (typeof fields.name === 'string' && fields.name) ||
      'Untitled Project';

    const githubUrl =
      (typeof fields.github_url === 'string' && fields.github_url) ||
      (typeof fields.repo_url === 'string' && fields.repo_url) ||
      null;

    const demoUrl =
      (typeof fields.demo_url === 'string' && fields.demo_url) ||
      (typeof fields.live_url === 'string' && fields.live_url) ||
      null;

    return {
      id: s.id,
      projectName,
      teamName: s.teams?.name || 'Unknown Team',
      track: s.teams?.track || 'General',
      status: s.status as FormattedSubmission['status'],
      githubUrl,
      demoUrl,
      submittedAt: s.submitted_at
        ? new Date(s.submitted_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : '—',
      updatedAt: new Date(s.updated_at || s.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
  });

  return (
    <SubmissionsClient
      eventId={eventId}
      initialSubmissions={formatted}
    />
  );
}