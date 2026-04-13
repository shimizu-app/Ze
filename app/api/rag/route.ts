import { NextResponse } from "next/server";
import {
  generateAvatarResponse,
  generateAvatarResponseStream,
  loadMeetingContext,
  type TurnMessage,
} from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  const userText = (body.user_text as string | undefined)?.trim();
  const history = (body.history as TurnMessage[] | undefined) ?? [];
  const stream = body.stream !== false; // default: stream

  if (!roomId || !userText) {
    return NextResponse.json({ error: "room_id and user_text required" }, { status: 400 });
  }

  const loaded = await loadMeetingContext(roomId);
  if (!loaded) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  // Non-streaming fallback (kept for compatibility and internal callers).
  if (!stream) {
    const text = await generateAvatarResponse({
      userText,
      history,
      context: loaded.context,
    });
    return NextResponse.json({ text, meeting_id: loaded.meeting.id });
  }

  // Server-Sent Events: one JSON object per line prefixed with "data: ".
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        send({ type: "meta", meeting_id: loaded.meeting.id });
        for await (const chunk of generateAvatarResponseStream({
          userText,
          history,
          context: loaded.context,
        })) {
          send({ type: "chunk", text: chunk });
        }
        send({ type: "done" });
      } catch (err) {
        console.error("[rag sse] failed", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "unknown",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
