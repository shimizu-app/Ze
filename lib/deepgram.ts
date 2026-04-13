/**
 * Server-side Deepgram helper.
 * For simplicity we return the raw API key here — Deepgram recommends
 * creating short-lived keys via the Projects API, but that requires a
 * project ID and extra setup. For Phase 2 we pass the long-lived key
 * only to the browser via an authenticated token endpoint; rotation
 * and short-lived scoping is a Phase 2.1 improvement.
 */
export async function getDeepgramSessionKey(): Promise<string> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  return key;
}
