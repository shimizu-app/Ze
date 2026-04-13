import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { MeetRoom } from "@/components/meet/MeetRoom";

export const dynamic = "force-dynamic";

export default async function MeetPage({ params }: { params: { roomId: string } }) {
  const supabase = createServiceClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, room_id, company_name, contact_name, avatar_id, mode, host_paused")
    .eq("room_id", params.roomId)
    .maybeSingle();

  if (!meeting) notFound();

  let avatarName = "営業アバター";
  let heygenAvatarId = "";
  let voiceId: string | undefined;
  let greeting = `こんにちは、${meeting.company_name}様。本日はお時間いただきありがとうございます。私がAI営業担当を務めさせていただきます。本日はどのようなことを重点的にお話できればよろしいでしょうか？`;

  if (meeting.avatar_id) {
    const { data: avatar } = await supabase
      .from("avatars")
      .select("name, heygen_avatar_id, voice_tone, character_notes, goal")
      .eq("id", meeting.avatar_id)
      .maybeSingle();
    if (avatar) {
      avatarName = avatar.name ?? avatarName;
      heygenAvatarId = avatar.heygen_avatar_id ?? "";
      voiceId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_VOICE;
    }
  }

  if (!heygenAvatarId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-amber/40 bg-s1 p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-lg font-semibold mb-2">アバター未設定</div>
          <p className="text-sm text-white/60">
            この会議にはアバターが紐付いていないか、HeyGen Avatar ID が設定されていません。
            作成者にお問い合わせください。
          </p>
          <div className="mono text-[10px] text-white/30 mt-6">ROOM {meeting.room_id}</div>
        </div>
      </div>
    );
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
    />
  );
}
