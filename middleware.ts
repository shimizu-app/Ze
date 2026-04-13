import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal pass-through middleware.
 *
 * We previously ran @supabase/ssr here to refresh the auth session on
 * every request, but the Edge Runtime was returning
 * MIDDLEWARE_INVOCATION_FAILED in production. Page-level auth is
 * already enforced in app/(app)/layout.tsx via the server Supabase
 * client, so stripping middleware down to a no-op is safe: protected
 * routes still bounce to /login, just after the request reaches the
 * page instead of at the edge.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
