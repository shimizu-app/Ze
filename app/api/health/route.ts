import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal health check used for diagnosing Vercel deployment state.
 * If this returns 200 with the latest commit hash, we know the
 * deployment is live. If it 404s, Vercel is still serving an old
 * deployment.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    commit: "141740f",
    ts: new Date().toISOString(),
    env: {
      has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      has_supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      has_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_gemini: Boolean(process.env.GEMINI_API_KEY),
      has_heygen: Boolean(process.env.HEYGEN_API_KEY),
      has_deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    },
  });
}
