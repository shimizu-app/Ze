/**
 * Server-side HeyGen helper.
 * Creates short-lived streaming session tokens and exposes the
 * avatar / voice catalog so the raw API key never reaches the
 * browser.
 */

const API_BASE = "https://api.heygen.com";

function apiKey() {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY is not set");
  return key;
}

export async function createHeyGenSessionToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/streaming.create_token`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen token request failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new Error("HeyGen token response missing token field");
  return token;
}

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string | null;
  preview_image_url: string | null;
  preview_video_url: string | null;
}

/**
 * List all streaming-capable avatars on the HeyGen account.
 * Uses the streaming/avatar.list endpoint which returns avatars
 * compatible with @heygen/streaming-avatar.
 */
export async function listHeyGenAvatars(): Promise<HeyGenAvatar[]> {
  const res = await fetch(`${API_BASE}/v1/streaming/avatar.list`, {
    headers: { "x-api-key": apiKey() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen avatar list failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
  };
  const list = Array.isArray(json.data) ? json.data : [];
  return list.map((row) => ({
    avatar_id: String(row.avatar_id ?? row.id ?? ""),
    avatar_name: String(row.avatar_name ?? row.name ?? row.avatar_id ?? "Unnamed"),
    gender: typeof row.gender === "string" ? row.gender : null,
    preview_image_url:
      typeof row.normal_preview === "string"
        ? row.normal_preview
        : typeof row.preview_image_url === "string"
        ? row.preview_image_url
        : typeof row.preview_image === "string"
        ? row.preview_image
        : null,
    preview_video_url:
      typeof row.preview_video_url === "string"
        ? row.preview_video_url
        : typeof row.preview_video === "string"
        ? row.preview_video
        : null,
  }));
}

export interface HeyGenVoice {
  voice_id: string;
  name: string;
  language: string;
  gender: string | null;
  preview_audio: string | null;
}

/**
 * List voices available to the HeyGen account.
 * Filters down to a target language (default "ja") so the picker
 * stays manageable.
 */
export async function listHeyGenVoices(language = "ja"): Promise<HeyGenVoice[]> {
  const res = await fetch(`${API_BASE}/v2/voices`, {
    headers: { "x-api-key": apiKey() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen voice list failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data?: { voices?: Array<Record<string, unknown>> };
  };
  const list = json.data?.voices ?? [];
  const lang = language.toLowerCase();
  return list
    .map((row) => ({
      voice_id: String(row.voice_id ?? row.id ?? ""),
      name: String(row.name ?? row.voice_id ?? "Voice"),
      language: String(row.language ?? "").toLowerCase(),
      gender: typeof row.gender === "string" ? row.gender : null,
      preview_audio: typeof row.preview_audio === "string" ? row.preview_audio : null,
    }))
    .filter(
      (v) =>
        v.voice_id !== "" &&
        (v.language === lang ||
          v.language.startsWith(lang) ||
          v.language === "japanese")
    );
}
