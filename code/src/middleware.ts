import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { API_PATHS, ROUTE_PATHS } from "@/lib/constants";
import { applySecurityHeaders, validateOrigin } from "@/lib/security";

function middleware(request: NextRequest) {
  // CSRF origin validation for state-changing requests
  const csrfError = validateOrigin(request);
  if (csrfError) return applySecurityHeaders(csrfError);

  // Default: pass through (withAuth handles redirect below)
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export default withAuth(middleware, {
  pages: {
    signIn: ROUTE_PATHS.LOGIN,
  },
});

export const config = {
  // Protect all routes except public ones
  matcher: [
    `/((?!${ROUTE_PATHS.LOGIN.slice(1)}|api/auth|${API_PATHS.HEALTH.slice(1)}|_next/static|_next/image|favicon\\.ico|favicon\\.svg).*)`,
  ],
};
