import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/meet", "/_next", "/favicon.ico"];

/**
 * Session middleware.
 * Fail-open: if the Supabase env vars are missing, or if any Supabase
 * call throws (network blip, bad key, etc), we let the request through
 * untouched rather than returning a 500. Protected pages still run
 * their own server-side auth check via createClient() in server.ts,
 * so an unauth'd request that slips past here will just bounce to
 * /login on the page itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No env vars configured (build time / misconfigured deploy) — skip auth.
  if (!url || !key) {
    return response;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

    if (!user && !isPublic) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (user && (path === "/login" || path === "/signup")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/home";
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (err) {
    console.error("[middleware] updateSession failed", err);
    return response;
  }
}
