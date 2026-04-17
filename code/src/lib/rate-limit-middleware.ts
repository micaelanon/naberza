/**
 * Rate limit middleware for Next.js API routes.
 * Extracts client IP (respecting X-Forwarded-For for proxies) and checks rate limit.
 * Returns 429 Too Many Requests if limit exceeded.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultRateLimiter } from "./rate-limiter";

export function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (set by proxies/CDN)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Fallback: request IP from NextRequest socket (Vercel/Node.js)
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const clientIp = getClientIp(request);
  const limiter = defaultRateLimiter;

  const { allowed, remaining, resetAt } = limiter.check(clientIp);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetAt.toString(),
        },
      },
    );
  }

  // Attach rate limit info to response headers
  const response = await handler(request);
  response.headers.set("X-RateLimit-Limit", "100");
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", resetAt.toString());

  return response;
}
