/**
 * Server-side LiveAvatar helpers.
 *
 * LiveAvatar is HeyGen's successor to the Streaming Avatar API
 * (which is being sunset end of March 2026). We add this in parallel
 * to lib/heygen.ts so we can flip the meet room over to the new
 * pipeline without breaking the existing flow.
 *
 * Auth uses an X-API-KEY header. If LIVEAVATAR_API_KEY is unset, we
 * fall back to HEYGEN_API_KEY since LiveAvatar accounts are issued
 * inside the same HeyGen workspace today.
 */

const API_BASE = "https://api.liveavatar.com";

function apiKey() {
  const key = process.env.LIVEAVATAR_API_KEY || process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("LIVEAVATAR_API_KEY (or HEYGEN_API_KEY) is not set");
  return key;
}

export interface LiveAvatarSessionToken {
  session_id: string;
  session_token: string;
}

/**
 * Create a session token for a FULL-mode interactive avatar.
 * The returned session_token is what the @heygen/liveavatar-web-sdk
 * LiveAvatarSession constructor consumes.
 */
export async function createLiveAvatarSessionToken(params: {
  avatar_id: string;
  voice_id?: string;
  language?: string;
  is_sandbox?: boolean;
}): Promise<LiveAvatarSessionToken> {
  const body: Record<string, unknown> = {
    mode: "FULL",
    avatar_id: params.avatar_id,
    avatar_persona: {
      ...(params.voice_id ? { voice_id: params.voice_id } : {}),
      language: params.language ?? "ja",
    },
    is_sandbox: params.is_sandbox ?? false,
    interactivity_type: "CONVERSATIONAL",
  };

  const res = await fetch(`${API_BASE}/v1/sessions/token`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LiveAvatar token request failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    code?: number;
    data?: { session_id?: string; session_token?: string };
  };
  const data = json.data;
  if (!data?.session_id || !data?.session_token) {
    throw new Error("LiveAvatar token response missing fields");
  }
  return { session_id: data.session_id, session_token: data.session_token };
}

export interface LiveAvatarOption {
  id: string;
  name: string;
  type: "VIDEO" | "IMAGE" | string;
  status: string;
  preview_url: string | null;
  default_voice_id: string | null;
  default_voice_name: string | null;
}

/**
 * List public avatars from LiveAvatar. Paginated; we fetch the first
 * page (up to 100) which is enough for a picker grid.
 */
export async function listLiveAvatars(): Promise<LiveAvatarOption[]> {
  const res = await fetch(`${API_BASE}/v1/avatars/public?page=1&page_size=100`, {
    headers: { "X-API-KEY": apiKey() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LiveAvatar list failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data?: { results?: Array<Record<string, unknown>> };
  };
  const list = json.data?.results ?? [];
  return list
    .map((row) => {
      const voice = row.default_voice as { id?: string; name?: string } | undefined;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? "Unnamed"),
        type: typeof row.type === "string" ? row.type : "VIDEO",
        status: typeof row.status === "string" ? row.status : "UNKNOWN",
        preview_url: typeof row.preview_url === "string" ? row.preview_url : null,
        default_voice_id: typeof voice?.id === "string" ? voice.id : null,
        default_voice_name: typeof voice?.name === "string" ? voice.name : null,
      };
    })
    .filter((a) => a.id !== "" && a.status === "ACTIVE");
}
