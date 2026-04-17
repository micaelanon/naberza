/**
 * Security headers middleware for Next.js.
 * Adds standard security headers to all responses.
 * CSP is intentionally permissive for now (single-user local-first app);
 * tighten when deploying to production with known origins.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0", // Modern browsers don't need it; CSP replaces it
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Validate Origin/Referer for state-changing methods (CSRF protection).
 * JSON APIs with SameSite cookies are largely safe, but this is defense-in-depth.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(method)) return null;

  // Skip CSRF check for webhook routes (token-authenticated, no cookies)
  if (request.nextUrl.pathname.startsWith("/webhooks/")) return null;

  // Skip CSRF check for health endpoint
  if (request.nextUrl.pathname === "/api/health") return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests without origin (same-origin fetch, curl, server-side)
  if (!origin) return null;

  // Validate origin matches host
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
  } catch {
    // Malformed origin — block it
  }

  return new NextResponse(JSON.stringify({ error: "CSRF validation failed" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
