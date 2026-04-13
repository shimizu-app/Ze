import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * PATCH /api/conversations/[id]
 * Body: { room_id, turn: { role, text, ts } } or { room_id, end: true }
 * Guests call this after each recognised turn; we verify the conversation
 * matches the provided room_id so stray callers can't append to
 * unrelated conversations.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  if (!roomId) return NextResponse.json({ error: "room_id required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, meeting_id, transcript, turns")
    .eq("id", params.id)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, room_id")
    .eq("id", conversation.meeting_id)
    .maybeSingle();
  if (!meeting || meeting.room_id !== roomId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (body.end === true) {
    await supabase
      .from("meetings")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meeting.id);
    return NextResponse.json({ ok: true });
  }

  const turn = body.turn as { role: "user" | "assistant"; text: string; ts?: string } | undefined;
  if (!turn || !turn.role || !turn.text) {
    return NextResponse.json({ error: "turn required" }, { status: 400 });
  }

  const nextTranscript = Array.isArray(conversation.transcript)
    ? [...conversation.transcript, { ...turn, ts: turn.ts ?? new Date().toISOString() }]
    : [{ ...turn, ts: turn.ts ?? new Date().toISOString() }];
  const nextTurns = (conversation.turns ?? 0) + 1;

  const { error } = await supabase
    .from("conversations")
    .update({ transcript: nextTranscript, turns: nextTurns })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, turns: nextTurns });
}
