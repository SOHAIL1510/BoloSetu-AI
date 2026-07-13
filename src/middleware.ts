import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Simple in-memory rate limit map for local development fallback
const localRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkLocalRateLimit(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = localRateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    localRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function middleware(req: NextRequest) {
  // Read IP address from standard proxy headers
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const path = req.nextUrl.pathname;

  // 1. RATE LIMITING MIDDLEWARE
  // Limit API routes (excluding auth endpoints to prevent token refresh locks)
  if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const ratelimit = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(60, "10 s"), // 60 requests per 10s window in production
          analytics: true,
        });

        const { success } = await ratelimit.limit(`rate_limit:${ip}`);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "rate_limit_exceeded", message: "Too many requests. Please slow down." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.warn("Upstash Redis connection failed, falling back to local rate limiting:", err);
        const allowed = checkLocalRateLimit(ip, 60, 60000);
        if (!allowed) {
          return new NextResponse(
            JSON.stringify({ error: "rate_limit_exceeded", message: "Too many requests. Please slow down." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      // Local development fallback rate limiter (60 requests per minute)
      const allowed = checkLocalRateLimit(ip, 60, 60000);
      if (!allowed) {
        return new NextResponse(
          JSON.stringify({ error: "rate_limit_exceeded", message: "Too many requests. Please slow down." }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  // 2. AUTHENTICATION MIDDLEWARE
  // Whitelist routes that do NOT require authentication
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register") || path === "/";
  const isPublicApi =
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/twilio/twiml") ||
    path.startsWith("/api/twilio/gather") ||
    path.startsWith("/api/twilio/audio") ||
    path.startsWith("/api/twilio/status") ||
    path.startsWith("/api/inngest");

  if (isAuthPage || isPublicApi) {
    return NextResponse.next();
  }

  // Check NextAuth session JWT token
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || "supersecretnextauthsecretkey12345" });

  // Redirect to login if unauthenticated on dashboard paths
  if (!session) {
    if (path.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Matching paths configuration
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
