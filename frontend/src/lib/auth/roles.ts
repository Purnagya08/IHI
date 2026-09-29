/**
 * Role model & guards.
 * - participant / organizer: self-signup, email + password
 * - judge: NO password. Access only via magic link, scoped to one eventId.
 */

export const ROLES = ["participant", "organizer", "judge"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Can this role self-signup via /api/auth/signup? */
export function canSelfSignup(role: Role): boolean {
  return role === "participant" || role === "organizer";
}

/** Does this role require an eventId scope on its session? */
export function requiresEventScope(role: Role): boolean {
  return role === "judge";
}

/** Route-group access matrix. */
export const ROLE_ACCESS = {
  organizer: ["organizer"] as Role[],
  participant: ["participant", "organizer"] as Role[],
  judge: ["judge"] as Role[],
} as const;

/**
 * Computes post-login destination URL.
 * Supports both signatures:
 *   1) getPostLoginRedirectUrl(role, eventId)
 *   2) getPostLoginRedirectUrl(supabaseClient, userObject)
 */
export async function getPostLoginRedirectUrl(
  roleOrSupabase: Role | string | any,
  eventIdOrUser?: string | any
): Promise<string> {
  // Signature 2: Called with (supabase, user)
  if (
    roleOrSupabase &&
    typeof roleOrSupabase === "object" &&
    ("from" in roleOrSupabase || "auth" in roleOrSupabase)
  ) {
    const supabase = roleOrSupabase;
    const user = eventIdOrUser;
    let role = user?.user_metadata?.role || user?.app_metadata?.role;

    if (!role && user?.id) {
      try {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role) role = data.role;
      } catch {
        // Fallback to default participant if query fails
      }
    }
    return resolveRoleRedirect(role || "participant");
  }

  // Signature 1: Called with (role, eventId)
  return resolveRoleRedirect(roleOrSupabase, eventIdOrUser);
}

function resolveRoleRedirect(role?: string, eventId?: string): string {
  switch (role) {
    case "organizer":
      return "/dashboard/events";
    case "judge":
      return eventId
        ? `/judge/queue?eventId=${encodeURIComponent(eventId)}`
        : "/judge/queue";
    case "participant":
    default:
      return "/participant/dashboard";
  }
}