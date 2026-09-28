import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ihi_session";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dev-insecure-secret-do-not-use-in-production-000000000";
const ISSUER = "ihi.auth";
const AUDIENCE = "ihi.app";

type Role = "participant" | "organizer" | "judge";

interface EdgeClaims {
  sub: string;
  email: string;
  role: Role;
  eventId?: string;
  name?: string;
}

const PUBLIC_EXACT = new Set(["/"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return true;
  }
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/judge-login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/sponsors") ||
    pathname.startsWith("/hackathons")
  ) {
    return true;
  }
  return false;
}

function isOrganizerRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.includes("/dashboard");
}
function isParticipantRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/team") ||
    pathname.startsWith("/submit") ||
    pathname.startsWith("/results") ||
    pathname.startsWith("/participant")
  );
}

function isJudgeRoute(pathname: string): boolean {
  return pathname.startsWith("/judge");
}

async function readClaims(req: NextRequest): Promise<EdgeClaims | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const key = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const role = payload.role as Role;
    if (!role || !["participant", "organizer", "judge"].includes(role)) {
      return null;
    }

    return {
      sub: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      role,
      eventId: payload.eventId ? String(payload.eventId) : undefined,
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

function loginRedirect(req: NextRequest, reason?: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = reason ? `?error=${encodeURIComponent(reason)}` : "";
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next && next !== "/" && !next.startsWith("/login")) {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}

function judgeLoginRedirect(req: NextRequest, reason?: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/judge-login";
  url.search = reason ? `?error=${encodeURIComponent(reason)}` : "";
  return NextResponse.redirect(url);
}

function forbiddenRedirect(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "?error=FORBIDDEN";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const claims = await readClaims(req);

  // Judge routes validation
  if (isJudgeRoute(pathname)) {
    // Check JWT claim role first
    if (claims?.role === "judge") {
      return NextResponse.next();
    }

    // Fallback check for active judge cookies
    const judgeRole = req.cookies.get("ihi_role")?.value;
    const judgeSession = req.cookies.get("ihi_judge_session")?.value;

    if (judgeRole === "judge" || judgeSession === "active") {
      return NextResponse.next();
    }

    return judgeLoginRedirect(req, "SESSION_EXPIRED");
  }

  if (!claims) {
    return loginRedirect(req, "SESSION_MISSING");
  }

  if (pathname.startsWith("/events")) {
    if (claims.role !== "organizer" && claims.role !== "participant") {
      return forbiddenRedirect(req);
    }
    return NextResponse.next();
  }
  if (isOrganizerRoute(pathname)) {
    if (claims.role !== "organizer") {
      return forbiddenRedirect(req);
    }
    return NextResponse.next();
  }

  if (isParticipantRoute(pathname)) {
    if (claims.role !== "participant" && claims.role !== "organizer") {
      return forbiddenRedirect(req);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};