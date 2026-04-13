import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client that bypasses RLS.
 * Only use on the server (API routes, server components).
 * Never import this into client components.
 *
 * Falls back to a placeholder key at build time so Next.js module
 * loading doesn't crash when SUPABASE_SERVICE_ROLE_KEY is missing.
 * At runtime the real key MUST be provided — otherwise any Supabase
 * call will fail with an auth error.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
