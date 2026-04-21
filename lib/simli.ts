/**
 * Server-side Simli helpers.
 *
 * Simli provides real-time lip-synced avatar video via WebRTC.
 * The client sends PCM16 audio → Simli renders lip-synced video.
 * Much cheaper than HeyGen LiveAvatar ($0.05/min vs $0.15-0.30/min).
 *
 * Flow:
 *   1. Server generates session token (this file)
 *   2. Client creates SimliClient with token + video/audio elements
 *   3. speak(text) → TTS audio → PCM16 → sendAudioData → lip sync
 */

const API_BASE = "https://api.simli.ai";

function apiKey() {
  const key = process.env.SIMLI_API_KEY;
  if (!key) throw new Error("SIMLI_API_KEY is not set");
  return key;
}

export interface SimliSessionToken {
  session_token: string;
}

/**
 * Preset Simli faces — professional-looking ones for business use.
 * Full list: https://docs.simli.com/api-reference/preset-faces
 */
export const SIMLI_FACES = [
  { id: "tmp9i8bbq7c", name: "Tina", category: "business" },
  { id: "t7mwDl2hbQ8", name: "Kate", category: "business" },
  { id: "5514e24d-6086-46a3-ace4-6a7264e5cb7c", name: "Laila", category: "business" },
  { id: "a7a6ee2f-302c-4e8d-baae-a5cf8393c0e3", name: "Sabour", category: "business" },
  { id: "a26a3a3c-2d63-41b4-a1e1-d3b5c06fddfa", name: "Fred", category: "business" },
  { id: "2a295b41-19d0-4b1c-a83e-a42e0b768781", name: "Mark", category: "business" },
] as const;

export const DEFAULT_FACE_ID = SIMLI_FACES[0].id;

/**
 * Generate a Simli session token. The token is passed to the
 * SimliClient constructor on the browser side.
 */
export async function createSimliSessionToken(params: {
  faceId?: string;
}): Promise<SimliSessionToken> {
  const body = {
    apiKey: apiKey(),
    config: {
      faceId: params.faceId ?? DEFAULT_FACE_ID,
      handleSilence: true,
      maxSessionLength: 3600,
      maxIdleTime: 300,
    },
  };

  const res = await fetch(`${API_BASE}/startAudioToVideoSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Simli session failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { session_token?: string };
  if (!json.session_token) {
    throw new Error("Simli response missing session_token");
  }

  return { session_token: json.session_token };
}
