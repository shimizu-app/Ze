import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createLiveAvatarSessionToken } from "@/lib/liveavatar";

export const dynamic = "force-dynamic";

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

  try {
    const token = await createLiveAvatarSessionToken({
      avatar_id: heygenAvatarId,
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
