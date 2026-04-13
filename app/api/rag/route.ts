import { NextResponse } from "next/server";
import { generateAvatarResponse, loadMeetingContext, type TurnMessage } from "@/lib/rag";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  const userText = (body.user_text as string | undefined)?.trim();
  const history = (body.history as TurnMessage[] | undefined) ?? [];

  if (!roomId || !userText) {
    return NextResponse.json({ error: "room_id and user_text required" }, { status: 400 });
  }

  const loaded = await loadMeetingContext(roomId);
  if (!loaded) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  const responseText = await generateAvatarResponse({
    userText,
    history,
    context: loaded.context,
  });

  return NextResponse.json({ text: responseText, meeting_id: loaded.meeting.id });
}
