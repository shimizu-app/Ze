import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a browser-side Supabase client. Falls back to a harmless
 * placeholder at build time so Next.js prerender doesn't crash when
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not
 * defined. At runtime the real values MUST be provided via environment
 * variables — otherwise any Supabase call will fail.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
