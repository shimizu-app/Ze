import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { MeetRoom } from "@/components/meet/MeetRoom";
import { SELF_DEMO_GREETING } from "@/lib/seed/sales-ai-lab-knowledge";

export const dynamic = "force-dynamic";

export default async function MeetPage({ params }: { params: { roomId: string } }) {
  const supabase = createServiceClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select(
      "id, room_id, company_name, contact_name, avatar_id, mode, host_paused, account_id, avatar_pipeline"
    )
    .eq("room_id", params.roomId)
    .maybeSingle();

  if (!meeting) notFound();

  let avatarName = "営業アバター";
  let heygenAvatarId = "";
  let voiceId: string | undefined;
  let scriptLines: string[] = [];
  const isSelfDemo = meeting.company_name === "Sales AI Lab Self-Demo";
  const greeting = isSelfDemo
    ? SELF_DEMO_GREETING
    : `こんにちは、${meeting.company_name}様。本日はお時間いただきありがとうございます。私がAI営業担当を務めさせていただきます。本日はどのようなことを重点的にお話できればよろしいでしょうか？`;

  // 1) The meeting has an avatar explicitly set.
  if (meeting.avatar_id) {
    const { data: avatar } = await supabase
      .from("avatars")
      .select("name, heygen_avatar_id, voice_id, script_lines")
      .eq("id", meeting.avatar_id)
      .maybeSingle();
    if (avatar) {
      avatarName = avatar.name ?? avatarName;
      heygenAvatarId = avatar.heygen_avatar_id ?? "";
      voiceId = avatar.voice_id ?? undefined;
      scriptLines = Array.isArray(avatar.script_lines)
        ? (avatar.script_lines as string[])
        : [];
    }
  }

  // 2) Fallback: pick the oldest avatar in this account.
  if (!heygenAvatarId) {
    const { data: fallback } = await supabase
      .from("avatars")
      .select("name, heygen_avatar_id, voice_id, script_lines")
      .eq("account_id", meeting.account_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fallback) {
      avatarName = fallback.name ?? avatarName;
      heygenAvatarId = fallback.heygen_avatar_id ?? "";
      voiceId = fallback.voice_id ?? undefined;
      scriptLines = Array.isArray(fallback.script_lines)
        ? (fallback.script_lines as string[])
        : [];
    }
  }

  // 3) Fallback: env-defined default avatar.
  if (!heygenAvatarId && process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_AVATAR) {
    heygenAvatarId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_AVATAR;
  }

  // 4) Fallback voice from env.
  if (!voiceId && process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_VOICE) {
    voiceId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_VOICE;
  }

  if (meeting.mode !== "ai_only") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-ac/30 bg-s1 p-8 text-center glow-ac">
          <div className="text-4xl mb-3">🚧</div>
          <div className="text-lg font-semibold mb-2">
            {meeting.mode === "ai_escalation" ? "AI + ホストエスカレーション" : "AI + ホスト同時参加"}
          </div>
          <p className="text-sm text-white/60">
            このモードは Phase 2.1 で実装予定です。現在利用できるのは「AI ノンブロッキング」モードのみです。
          </p>
        </div>
      </div>
    );
  }

  const avatarPipeline: "liveavatar" | "browser_tts" | "deepgram_tts" =
    meeting.avatar_pipeline === "browser_tts"
      ? "browser_tts"
      : meeting.avatar_pipeline === "deepgram_tts"
      ? "deepgram_tts"
      : "liveavatar";

  // Voice-only pipelines don't need a HeyGen avatar id, so only
  // block the liveavatar pipeline when the avatar is missing.
  if (!heygenAvatarId && avatarPipeline === "liveavatar") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-amber/40 bg-s1 p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-lg font-semibold mb-2">アバター未設定</div>
          <p className="text-sm text-white/60">
            プロモード会議にはアバターが必要です。お試しモードで作成するか、
            アバターを登録してから再度会議を開いてください。
          </p>
          <div className="mono text-[10px] text-white/30 mt-6">ROOM {meeting.room_id}</div>
        </div>
      </div>
    );
  }

  return (
    <MeetRoom
      meetingId={meeting.id}
      roomId={meeting.room_id}
      companyName={meeting.company_name}
      contactName={meeting.contact_name ?? null}
      avatarName={avatarName}
      heygenAvatarId={heygenAvatarId}
      voiceId={voiceId}
      greeting={greeting}
      initialHostPaused={Boolean(meeting.host_paused)}
      avatarPipeline={avatarPipeline}
      scriptLines={scriptLines}
    />
  );
}
