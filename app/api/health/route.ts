import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function prefix(val: string | undefined, n: number) {
  if (!val) return null;
  return `${val.slice(0, n)}... (len=${val.length})`;
}

/**
 * Diagnostic endpoint. Shows presence + prefixes + a real Supabase
 * auth ping so we can tell whether the env vars are not only set
 * but also valid.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let anonCheck: { ok: boolean; error?: string } = { ok: false };
  if (url && anon) {
    try {
      const supabase = createClient(url, anon);
      const { error } = await supabase.auth.getUser();
      anonCheck = error ? { ok: false, error: error.message } : { ok: true };
    } catch (err) {
      anonCheck = { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
  }

  let serviceCheck: { ok: boolean; error?: string } = { ok: false };
  if (url && service) {
    try {
      const supabase = createClient(url, service, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.from("accounts").select("id").limit(1);
      serviceCheck = error ? { ok: false, error: error.message } : { ok: true };
    } catch (err) {
      serviceCheck = { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      supabase_url: url ?? null,
      supabase_anon_prefix: prefix(anon, 30),
      supabase_service_prefix: prefix(service, 30),
      has_gemini: Boolean(process.env.GEMINI_API_KEY),
      has_heygen: Boolean(process.env.HEYGEN_API_KEY),
      has_deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    },
    checks: {
      anon_auth_ping: anonCheck,
      service_accounts_select: serviceCheck,
    },
  });
}
