import createMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { NextRequestWithAuth } from "next-auth/middleware";

import { ROUTE_PATHS } from "@/lib/constants";
import { applySecurityHeaders, validateOrigin } from "@/lib/security";

const intlMiddleware = createMiddleware({
  locales: ["es"],
  defaultLocale: "es",
  localePrefix: "never",
});

const authMiddleware = withAuth(
  (request: NextRequestWithAuth) => {
    // CSRF origin validation for state-changing requests
    const csrfError = validateOrigin(request);
    if (csrfError) return applySecurityHeaders(csrfError);

    const intlResponse = intlMiddleware(request);
    return applySecurityHeaders(intlResponse ?? NextResponse.next());
  },
  {
    pages: {
      signIn: ROUTE_PATHS.LOGIN,
    },
  },
);

export default function middleware(request: NextRequest) {
  return authMiddleware(request as NextRequestWithAuth, {} as never);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.svg).*)"],
};
