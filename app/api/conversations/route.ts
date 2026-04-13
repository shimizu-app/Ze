import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/conversations
 * Body: { room_id }
 * Creates a new conversation row tied to the meeting and returns its id.
 * Called by the guest browser when the meeting room first loads, so this
 * endpoint must be open to anonymous callers but scoped via room_id.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  if (!roomId) return NextResponse.json({ error: "room_id required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, account_id, company_name")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      meeting_id: meeting.id,
      account_id: meeting.account_id,
      company_name: meeting.company_name,
      outcome: "pending",
      turns: 0,
      transcript: [],
    })
    .select("id")
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: error?.message ?? "failed" }, { status: 500 });
  }

  // Mark meeting as live.
  await supabase
    .from("meetings")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", meeting.id);

  return NextResponse.json({ conversation_id: conversation.id });
}
