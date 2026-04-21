import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLiveAvatarSessionToken, listLiveAvatars } from "@/lib/liveavatar";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retry wrapper for upstream LiveAvatar API calls. The API
 * intermittently returns 503 (DNS cache overflow) — retrying
 * after a short backoff resolves it.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = /503|502|504|DNS|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg);
      if (isRetryable && attempt < maxAttempts) {
        console.warn(`[liveavatar token] ${label} attempt ${attempt} failed (${msg}), retrying...`);
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * POST /api/liveavatar/token
 * Body: { room_id }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  if (!roomId) return NextResponse.json({ error: "room_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, account_id, avatar_id")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  // Resolve avatar (explicit → account fallback → env default)
  let heygenAvatarId = "";
  let voiceId: string | undefined;
  if (meeting.avatar_id) {
    const { data: avatar } = await supabase
      .from("avatars")
      .select("heygen_avatar_id, voice_id")
      .eq("id", meeting.avatar_id)
      .maybeSingle();
    if (avatar) {
      heygenAvatarId = avatar.heygen_avatar_id ?? "";
      voiceId = avatar.voice_id ?? undefined;
    }
  }
  if (!heygenAvatarId) {
    const { data: fallback } = await supabase
      .from("avatars")
      .select("heygen_avatar_id, voice_id")
      .eq("account_id", meeting.account_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fallback) {
      heygenAvatarId = fallback.heygen_avatar_id ?? "";
      voiceId = fallback.voice_id ?? undefined;
    }
  }
  if (!heygenAvatarId) heygenAvatarId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_AVATAR ?? "";
  if (!voiceId) voiceId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_VOICE;

  if (!heygenAvatarId) {
    return NextResponse.json({ error: "no avatar configured" }, { status: 400 });
  }

  // If the stored avatar ID is a HeyGen string (not a UUID), it won't
  // work with LiveAvatar. Look up a matching LiveAvatar avatar instead.
  let liveAvatarId = heygenAvatarId;
  if (!UUID_RE.test(heygenAvatarId)) {
    console.warn(
      `[liveavatar token] avatar_id "${heygenAvatarId}" is not a UUID, picking from LiveAvatar catalog`
    );
    try {
      const avatars = await withRetry(() => listLiveAvatars(), "catalog");
      if (avatars.length > 0) {
        const byName = avatars.find(
          (a) => a.name.toLowerCase().includes(heygenAvatarId.split("_")[0].toLowerCase())
        );
        liveAvatarId = byName?.id ?? avatars[0].id;
        if (byName) {
          console.log(`[liveavatar token] matched "${heygenAvatarId}" → "${byName.name}" (${byName.id})`);
        } else {
          console.log(`[liveavatar token] no name match, using first: "${avatars[0].name}" (${avatars[0].id})`);
        }
      }
    } catch (err) {
      console.error("[liveavatar token] catalog lookup failed after retries", err);
    }
  }

  console.log(`[liveavatar token] creating session: avatar=${liveAvatarId}, voice=${voiceId ?? "default"}`);
  try {
    const token = await withRetry(
      () => createLiveAvatarSessionToken({
        avatar_id: liveAvatarId,
        voice_id: voiceId,
        language: "ja",
      }),
      "session"
    );
    console.log(`[liveavatar token] success: session=${token.session_id}`);
    return NextResponse.json(token);
  } catch (err) {
    console.error("[liveavatar token] all retries failed:", err);
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json(
      {
        error: msg,
        debug: {
          avatar_id_db: heygenAvatarId,
          avatar_id_used: liveAvatarId,
          voice_id: voiceId ?? null,
          is_uuid: UUID_RE.test(heygenAvatarId),
        },
      },
      { status: 500 }
    );
  }
}
