import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ihi_session";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dev-insecure-secret-do-not-use-in-production-000000000";
const ISSUER = "ihi.auth";
const AUDIENCE = "ihi.app";

async function createJudgeSessionResponse(
  email: string,
  eventId: string,
  targetPath: string,
  requestUrl: string
) {
  const secret = new TextEncoder().encode(JWT_SECRET);

  // Generate a real JWT token matching middleware's readClaims() expected payload
  const token = await new SignJWT({
    sub: `judge_${Date.now()}`,
    email: email,
    role: "judge",
    eventId: eventId,
    name: "Judge Operative",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("7d")
    .sign(secret);

  const redirectTarget = new URL(targetPath, requestUrl);
  const response = NextResponse.redirect(redirectTarget);

  const baseCookieOpts = {
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  // Set the signed JWT session cookie read by middleware
  response.cookies.set(COOKIE_NAME, token, {
    ...baseCookieOpts,
    httpOnly: true,
  });

  // Set secondary helper cookies
  response.cookies.set("ihi_role", "judge", { ...baseCookieOpts, httpOnly: false });
  response.cookies.set("ihi_judge_session", "active", { ...baseCookieOpts, httpOnly: false });
  response.cookies.set("ihi_user_email", email, { ...baseCookieOpts, httpOnly: false });
  response.cookies.set("ihi_event_id", eventId, { ...baseCookieOpts, httpOnly: false });

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim();
  const eventId = searchParams.get("eventId")?.trim();

  if (!email || !eventId) {
    return NextResponse.json(
      { error: "Email and event ID are required." },
      { status: 400 }
    );
  }

  return createJudgeSessionResponse(email, eventId, "/judge/queue", request.url);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    const eventId = String(body.eventId || "").trim();

    if (!email || !eventId) {
      return NextResponse.json(
        { error: "Email and event ID are required." },
        { status: 400 }
      );
    }

    return createJudgeSessionResponse(email, eventId, "/judge/queue", request.url);
  } catch {
    return NextResponse.json(
      { error: "Failed to initialize judge session" },
      { status: 500 }
    );
  }
}