import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function MeetRoom({ params }: { params: { roomId: string } }) {
  const supabase = createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("room_id", params.roomId)
    .single();

  if (!meeting) notFound();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full rounded-3xl border border-ac/30 bg-s1 p-10 glow-ac text-center">
        <div className="mono text-[10px] text-ac/70 mb-3">MEETING ROOM // {meeting.room_id}</div>
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-ac">{meeting.company_name}</span> との商談
        </h1>
        {meeting.contact_name && (
          <div className="text-white/60 mb-6">{meeting.contact_name} 様</div>
        )}

        <div className="rounded-2xl border border-white/10 bg-s2 p-8 my-8">
          <div className="text-ac text-5xl mb-3">🎭</div>
          <div className="text-xl font-semibold mb-2">AIアバターが準備中</div>
          <p className="text-sm text-white/60 mb-4">
            この会議室は Phase 2 で実装されます。
            <br />
            WebRTC + HeyGen LiveAvatar + Deepgram + Gemini RAG が統合される予定です。
          </p>
          <div className="mono text-[10px] text-white/40 mt-6">
            STATUS: {meeting.status?.toUpperCase()}
          </div>
        </div>

        <div className="text-xs text-white/40">
          Phase 1 完了時点：会議リンクの発行までが実装済み
        </div>
      </div>
    </div>
  );
}
