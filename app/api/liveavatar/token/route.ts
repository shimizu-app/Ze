import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLiveAvatarSessionToken, listLiveAvatars } from "@/lib/liveavatar";

export const dynamic = "force-dynamic";

// LiveAvatar requires UUID-format avatar IDs. HeyGen's v2 catalog
// returns string IDs like "Abigail_expressive_2024112501" which
// LiveAvatar rejects with a 422. This regex detects non-UUID IDs
// so we can fall back to the LiveAvatar public catalog.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/liveavatar/token
 * Body: { room_id }
 *
 * Looks up the meeting + linked avatar (or the account fallback) and
 * mints a LiveAvatar session token that the new SDK can use to
 * connect. Mirrors the existing /api/heygen/token contract so the
 * meet room can be flipped over with a feature flag.
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
      const avatars = await listLiveAvatars();
      if (avatars.length > 0) {
        // Try to find one with a similar name, otherwise pick the first active one.
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
      console.error("[liveavatar token] catalog lookup failed", err);
    }
  }

  try {
    const token = await createLiveAvatarSessionToken({
      avatar_id: liveAvatarId,
      voice_id: voiceId,
      language: "ja",
    });
    return NextResponse.json(token);
  } catch (err) {
    console.error("[liveavatar token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
