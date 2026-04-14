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

/**
 * Key used specifically for LiveAvatar calls (api.liveavatar.com).
 * Prefers LIVEAVATAR_API_KEY so visitors can swap in a different
 * LiveAvatar workspace without touching HEYGEN_API_KEY — useful when
 * testing a second HeyGen account or a dedicated LiveAvatar billing
 * plan. Falls back to HEYGEN_API_KEY for the common case where both
 * services share the same key.
 */
function liveAvatarKey() {
  const key = process.env.LIVEAVATAR_API_KEY || process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("LIVEAVATAR_API_KEY (or HEYGEN_API_KEY) is not set");
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
 * List avatars available to the workspace.
 *
 * HeyGen's public /v2/avatars endpoint started returning 401 on
 * accounts that have already been migrated to LiveAvatar — the
 * deprecation_notice in the response confirms the streaming-era
 * API is being phased out. We try /v2/avatars first for backwards
 * compatibility, and fall back to LiveAvatar's /v1/avatars/public on
 * any failure so the picker keeps populating.
 */
export async function listHeyGenAvatars(): Promise<HeyGenAvatar[]> {
  // 1) Legacy HeyGen v2/avatars
  try {
    const res = await fetch(`${API_BASE}/v2/avatars`, {
      headers: { "x-api-key": apiKey() },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: {
          avatars?: Array<Record<string, unknown>>;
          talking_photos?: Array<Record<string, unknown>>;
        };
      };
      const list = [
        ...(json.data?.avatars ?? []),
        ...(json.data?.talking_photos ?? []),
      ];
      const mapped = list
        .map((row) => ({
          avatar_id: String(row.avatar_id ?? row.id ?? row.talking_photo_id ?? ""),
          avatar_name: String(
            row.avatar_name ?? row.talking_photo_name ?? row.name ?? row.avatar_id ?? "Unnamed"
          ),
          gender: typeof row.gender === "string" ? row.gender : null,
          preview_image_url:
            typeof row.preview_image_url === "string"
              ? row.preview_image_url
              : typeof row.normal_preview === "string"
              ? row.normal_preview
              : typeof row.preview_image === "string"
              ? row.preview_image
              : null,
          preview_video_url:
            typeof row.preview_video_url === "string"
              ? row.preview_video_url
              : typeof row.preview_video === "string"
              ? row.preview_video
              : null,
        }))
        .filter((a) => a.avatar_id !== "");
      if (mapped.length > 0) return mapped;
    } else {
      const text = await res.text();
      console.warn(`[heygen] /v2/avatars ${res.status} — falling back to LiveAvatar: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[heygen] /v2/avatars threw — falling back to LiveAvatar", err);
  }

  // 2) LiveAvatar /v1/avatars/public — this is the supported pipeline now.
  const liveRes = await fetch(
    `https://api.liveavatar.com/v1/avatars/public?page=1&page_size=100`,
    { headers: { "X-API-KEY": liveAvatarKey() } }
  );
  if (!liveRes.ok) {
    const text = await liveRes.text();
    throw new Error(`Avatar catalog unavailable: ${liveRes.status} ${text}`);
  }
  const liveJson = (await liveRes.json()) as {
    data?: { results?: Array<Record<string, unknown>> };
  };
  const results = liveJson.data?.results ?? [];
  return results
    .map((row) => {
      const voice = row.default_voice as { name?: string } | undefined;
      return {
        avatar_id: String(row.id ?? ""),
        avatar_name: String(row.name ?? voice?.name ?? "Unnamed"),
        gender: null as string | null,
        preview_image_url: typeof row.preview_url === "string" ? row.preview_url : null,
        preview_video_url: null as string | null,
      };
    })
    .filter((a) => a.avatar_id !== "");
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
