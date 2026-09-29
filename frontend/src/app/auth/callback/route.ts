import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPostLoginRedirectUrl } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next');

  // Handle errors provided directly by Supabase in the redirect URL
  if (errorParam || errorDescription) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_link', requestUrl.origin)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_link', requestUrl.origin)
      );
    }

    // Honor safe local ?next= redirects (e.g. judge magic-link -> /judge/queue).
    if (
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.includes("ashish01234")
    ) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Role-aware routing (organizers -> /dashboard/events).
    const destination = await getPostLoginRedirectUrl(supabase, data.user);
    return NextResponse.redirect(new URL(destination, requestUrl.origin));
  }

  // Fallback if no PKCE code is present
  return NextResponse.redirect(
    new URL('/login?error=session_missing', requestUrl.origin)
  );
}