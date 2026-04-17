/* eslint-disable sonarjs/no-clear-text-protocols */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { applySecurityHeaders, validateOrigin } from "../security-headers";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

function makeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: new Headers(headers),
  });
}

describe("applySecurityHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const res = applySecurityHeaders(NextResponse.next());
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options to DENY", () => {
    const res = applySecurityHeaders(NextResponse.next());
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Referrer-Policy", () => {
    const res = applySecurityHeaders(NextResponse.next());
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy", () => {
    const res = applySecurityHeaders(NextResponse.next());
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("sets Content-Security-Policy with frame-ancestors none", () => {
    const res = applySecurityHeaders(NextResponse.next());
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
  });
});

describe("validateOrigin — safe methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET requests regardless of origin", () => {
    const req = makeRequest("GET", "/api/tasks", {
      origin: "http://evil.com",
      host: "localhost:3000",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it("allows HEAD requests", () => {
    const req = makeRequest("HEAD", "/api/tasks", { host: "localhost:3000" });
    expect(validateOrigin(req)).toBeNull();
  });
});

describe("validateOrigin — POST requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows POST when origin matches host", () => {
    const req = makeRequest("POST", "/api/tasks", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it("allows POST without origin header (same-origin fetch)", () => {
    const req = makeRequest("POST", "/api/tasks", { host: "localhost:3000" });
    expect(validateOrigin(req)).toBeNull();
  });

  it("blocks POST with mismatched origin", () => {
    const req = makeRequest("POST", "/api/tasks", {
      origin: "http://evil.com",
      host: "localhost:3000",
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("blocks POST with malformed origin", () => {
    const req = makeRequest("POST", "/api/tasks", {
      origin: "not-a-url",
      host: "localhost:3000",
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});

describe("validateOrigin — exemptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips CSRF for webhook routes", () => {
    const req = makeRequest("POST", "/webhooks/api/tok123", {
      origin: "http://external.com",
      host: "localhost:3000",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it("skips CSRF for /api/health", () => {
    const req = makeRequest("POST", "/api/health", {
      origin: "http://external.com",
      host: "localhost:3000",
    });
    expect(validateOrigin(req)).toBeNull();
  });
});
